from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import cv2
import numpy as np
import torch
import base64
from PIL import Image
from torchvision import transforms
from torchvision.models.detection import ssd300_vgg16

from utils import (
    extract_ridge_components, 
    build_affinity_matrix, 
    cluster_components, 
    reconstruct_full_ridges, 
    spatial_fallback_split, 
    refine_boundary, 
    clean_separation
)

app = FastAPI(title="FingCheck Separation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ FIXED MODEL PATH
MODEL_PATH = "best_model.pth"

IMAGE_SIZE = 300
NUM_CLASSES = 2
CONFIDENCE_THRESHOLD = 0.5
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

model = None

@app.on_event("startup")
async def load_model():
    global model
    print(f"🔄 Loading model on {device}...")
    try:
        model = ssd300_vgg16(weights=None, num_classes=NUM_CLASSES)
        model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
        model.to(device)
        model.eval()
        print("✅ Model loaded successfully")
    except Exception as e:
        print(f"❌ Model load error: {e}")

def get_transform():
    return transforms.Compose([
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])

def predict_bbox(model, image, transform):
    pil_img = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    tensor = transform(pil_img).unsqueeze(0).to(device)

    with torch.no_grad():
        output = model(tensor)[0]

    if len(output['boxes']) == 0:
        return None, 0.0

    scores = output['scores'].cpu().numpy()
    boxes = output['boxes'].cpu().numpy()

    idx = np.argmax(scores)
    return boxes[idx], scores[idx]

def scale_bbox(bbox, original_size):
    ow, oh = original_size
    x1, y1, x2, y2 = bbox
    return [
        int(x1 * ow / 300), int(y1 * oh / 300),
        int(x2 * ow / 300), int(y2 * oh / 300)
    ]

def erase_with_ellipse(image, bbox):
    x1, y1, x2, y2 = bbox
    cx, cy = (x1+x2)//2, (y1+y2)//2
    sx, sy = (x2-x1)//2, (y2-y1)//2

    mask = np.zeros(image.shape[:2], dtype=np.uint8)
    cv2.ellipse(mask, (cx, cy), (sx, sy), 0, 0, 360, 255, -1)

    blur = cv2.GaussianBlur(mask, (25,25), 0) / 255.0

    res = image.copy()
    for c in range(3):
        res[:,:,c] = (image[:,:,c]*(1-blur) + 255*blur).astype(np.uint8)

    return res

def preprocess(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(2.0,(8,8))
    enh = clahe.apply(gray)

    blur = cv2.GaussianBlur(enh,(3,3),0.8)

    binary = cv2.adaptiveThreshold(
        blur,255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,25,8
    )

    return enh, binary

def to_base64(img):
    _, buf = cv2.imencode(".png", img)
    return base64.b64encode(buf).decode()

@app.post("/api/separate-fingerprints")
async def separate(file: UploadFile = File(...)):
    if not model:
        raise HTTPException(503, "Model not loaded")

    data = await file.read()
    img = cv2.imdecode(np.frombuffer(data,np.uint8), cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(400,"Invalid image")

    h,w = img.shape[:2]

    bbox, score = predict_bbox(model, img, get_transform())

    if bbox is None or score < CONFIDENCE_THRESHOLD:
        return {"status":"warning","message":"No overlap detected"}

    bbox = scale_bbox(bbox,(w,h))

    erased = erase_with_ellipse(img,bbox)
    enh, binary = preprocess(erased)

    comps, thin = extract_ridge_components(binary, enh)

    if len(comps) < 2:
        s1,s2 = spatial_fallback_split(binary)
    else:
        aff = build_affinity_matrix(comps)
        labels = cluster_components(comps,aff)
        s1,s2 = reconstruct_full_ridges(comps,labels,binary,thin)
        s1,s2 = refine_boundary(s1,s2,enh)

    s1 = clean_separation(s1)
    s2 = clean_separation(s2)

    return {
        "status":"success",
        "confidence":float(score),
        "fp1_base64":f"data:image/png;base64,{to_base64(255-s1)}",
        "fp2_base64":f"data:image/png;base64,{to_base64(255-s2)}"
    }

if __name__=="__main__":
    uvicorn.run(app,host="127.0.0.1",port=8000)