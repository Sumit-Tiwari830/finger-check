import torch
import torchvision
from torchvision import transforms
from torchvision.models.detection import ssd300_vgg16

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

import cv2
import numpy as np
import io
import base64
from PIL import Image

# ==========================================
# MISSING IMPORT LINKING UTILS.PY
# ==========================================
from utils import (
    extract_ridge_components, 
    build_affinity_matrix, 
    cluster_components, 
    reconstruct_full_ridges, 
    spatial_fallback_split, 
    refine_boundary, 
    clean_separation
)

# ==========================================
# 1. SETUP & GLOBALS
# ==========================================
app = FastAPI(title="Fingerprint Separation API")

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model Settings
MODEL_PATH = "best_model.pth" 
IMAGE_SIZE = 300
NUM_CLASSES = 2
CONFIDENCE_THRESHOLD = 0.5
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

model = None

# ==========================================
# 2. STARTUP EVENT (Load Model)
# ==========================================
@app.on_event("startup")
async def load_model():
    global model
    print(f"Loading PyTorch model on {device}...")
    try:
        # 1. Build using a temporary variable
        temp_model = ssd300_vgg16(weights=None, num_classes=NUM_CLASSES)
        
        # 2. Load weights and move to device
        state_dict = torch.load(MODEL_PATH, map_location=device)
        temp_model.load_state_dict(state_dict)
        temp_model = temp_model.to(device)
        
        # 3. Set to eval
        temp_model.eval()
        for module in temp_model.modules():
            module.training = False
            
        # 4. Only assign to global if everything above succeeded
        model = temp_model
        print(f"Model loaded successfully on {device}.")
        
    except Exception as e:
        print(f"Failed to load model: {e}")
        # Explicitly set to None so the API returns a proper 503 instead of crashing later
        model = None 

# ==========================================
# 3. HELPER FUNCTIONS 
# ==========================================
def get_transform():
    return transforms.Compose([
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

def predict_bbox(model, image, transform):
    pil_img = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    
    # Check where the model actually lives right now
    model_device = next(model.parameters()).device
    
    # Move the tensor to match the model's device
    tensor = transform(pil_img).to(model_device)

    # Force eval mode right before inference
    model.eval()
    for module in model.modules():
        module.training = False

    with torch.no_grad():
        output = model([tensor])[0]

    if len(output['boxes']) == 0:
        return None, 0.0

    scores   = output['scores'].cpu().numpy()
    boxes    = output['boxes'].cpu().numpy()
    best_idx = np.argmax(scores)
    return boxes[best_idx], scores[best_idx]

def scale_bbox(bbox, original_size, model_size=300):
    orig_w, orig_h = original_size
    x_min, y_min, x_max, y_max = bbox
    return [
        int(x_min * orig_w / model_size), int(y_min * orig_h / model_size),
        int(x_max * orig_w / model_size), int(y_max * orig_h / model_size)
    ]

def erase_with_ellipse(image, bbox, padding_ratio=0.05, blur_size=25):
    x_min, y_min, x_max, y_max = bbox
    cx     = int((x_min + x_max) / 2)
    cy     = int((y_min + y_max) / 2)
    semi_x = int((x_max - x_min) / 2 * (1 - padding_ratio))
    semi_y = int((y_max - y_min) / 2 * (1 - padding_ratio))
    mask      = np.zeros(image.shape[:2], dtype=np.uint8)
    cv2.ellipse(mask, (cx, cy), (semi_x, semi_y), 0, 0, 360, 255, -1)
    blur_size = blur_size if blur_size % 2 == 1 else blur_size + 1
    mask_soft = cv2.GaussianBlur(mask, (blur_size, blur_size), 0)
    mask_norm = mask_soft.astype(float) / 255.0

    if len(image.shape) == 3:
        result = image.copy()
        for c in range(3):
            result[:, :, c] = (image[:, :, c] * (1 - mask_norm) + 255 * mask_norm).astype(np.uint8)
    else:
        result = (image * (1 - mask_norm) + 255 * mask_norm).astype(np.uint8)
    return result

def preprocess_gentle(img_array):
    if len(img_array.shape) == 3:
        img = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
    else:
        img = img_array.copy()
        
    clahe    = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(img)
    blurred  = cv2.GaussianBlur(enhanced, (3, 3), 0.8)
    binary   = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, blockSize=25, C=8
    )
    kernel_small = np.ones((2, 2), np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel_small, iterations=1)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN,  kernel_small, iterations=1)
    return img, enhanced, binary

def image_to_base64(img_array):
    is_success, buffer = cv2.imencode(".png", img_array)
    if not is_success:
        raise ValueError("Could not encode image to base64")
    io_buf = io.BytesIO(buffer)
    return base64.b64encode(io_buf.getvalue()).decode("utf-8")

# ==========================================
# 4. THE API ENDPOINT
# ==========================================
@app.post("/api/separate-fingerprints")
async def separate_fingerprints(file: UploadFile = File(...)):
    if not model:
        raise HTTPException(status_code=503, detail="Model is still loading or failed to load. Check server logs.")

    try:
        # 1. Read uploaded image into numpy array
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file.")

        orig_h, orig_w = image.shape[:2]
        transform = get_transform()

        # 2. PyTorch SSD Detection
        bbox_300, score = predict_bbox(model, image, transform)
        
        if bbox_300 is None or score < CONFIDENCE_THRESHOLD:
            return {
                "status": "warning",
                "message": "No overlap detected.",
                "overlap_base64": None, # ADDED THIS LINE
                "fp1_base64": f"data:image/png;base64,{image_to_base64(image)}",
                "fp2_base64": None
            }

        # 3. Scale bbox and Erase
        bbox = scale_bbox(bbox_300, (orig_w, orig_h))
        
        # ==========================================
        # NEW: Create Overlap Detected Image 
        # (Draws a green bounding box over the detection)
        # ==========================================
        overlap_viz = image.copy()
        cv2.rectangle(overlap_viz, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (0, 255, 0), 3)
        overlap_base64_data = image_to_base64(overlap_viz)
        # ==========================================

        erased_img = erase_with_ellipse(image, bbox)

        # 4. Clustering & Separation Pipeline
        original, enhanced, binary = preprocess_gentle(erased_img)
        components, thinned = extract_ridge_components(binary, enhanced, min_size=15) 

        if len(components) < 2:
            sep_1, sep_2 = spatial_fallback_split(binary)
        else:
            affinity = build_affinity_matrix(components, max_dist=120, ori_weight=0.4, spatial_weight=0.6)
            labels = cluster_components(components, affinity)
            sep_1, sep_2 = reconstruct_full_ridges(components, labels, binary, thinned)
            sep_1, sep_2 = refine_boundary(sep_1, sep_2, enhanced, block_size=16)

        sep_1 = clean_separation(sep_1, min_size=15)
        sep_2 = clean_separation(sep_2, min_size=15)

        fp1 = 255 - sep_1
        fp2 = 255 - sep_2

        # 5. Convert to Base64 and return
        return {
            "status": "success",
            "message": "Fingerprints separated successfully.",
            "confidence": float(score),
            "overlap_base64": f"data:image/png;base64,{overlap_base64_data}", # ADDED THIS LINE
            "fp1_base64": f"data:image/png;base64,{image_to_base64(fp1)}",
            "fp2_base64": f"data:image/png;base64,{image_to_base64(fp2)}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)