import cv2
import numpy as np
from scipy import ndimage
from scipy.spatial.distance import cdist
from sklearn.cluster import SpectralClustering, KMeans
from skimage.morphology import thin
import warnings

# Suppress warnings from scikit-learn for cleaner server logs
warnings.filterwarnings('ignore')

def extract_ridge_components(binary, enhanced, min_size=20):
    thinned = thin(binary > 0).astype(np.uint8) * 255
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(thinned, 8)

    gx = cv2.Sobel(enhanced.astype(np.float64), cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(enhanced.astype(np.float64), cv2.CV_64F, 0, 1, ksize=3)

    components = []
    h, w = binary.shape

    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        if area < min_size:
            continue

        mask   = labels == i
        ys, xs = np.where(mask)

        vx_sum = vy_sum = energy_sum = 0.0
        for y, x in zip(ys, xs):
            y1, y2 = max(0, y-4), min(h, y+5)
            x1, x2 = max(0, x-4), min(w, x+5)
            gx_l = gx[y1:y2, x1:x2]
            gy_l = gy[y1:y2, x1:x2]
            vx_sum     += np.sum(2 * gx_l * gy_l)
            vy_sum     += np.sum(gx_l**2 - gy_l**2)
            energy_sum += np.sum(gx_l**2 + gy_l**2)

        orientation = 0.5 * np.arctan2(vx_sum, vy_sum) % np.pi
        coherence   = np.sqrt(vx_sum**2 + vy_sum**2) / (energy_sum + 1e-6)

        components.append({
            'id': i, 'mask': mask, 'thinned_mask': mask,
            'centroid': (centroids[i][1], centroids[i][0]),
            'size': area, 'ys': ys, 'xs': xs,
            'orientation': orientation, 'coherence': coherence,
            'bbox': stats[i, :4]
        })

    return components, thinned

def build_affinity_matrix(components, max_dist=80, ori_weight=0.7, spatial_weight=0.3):
    n         = len(components)
    centroids = np.array([c['centroid']    for c in components])
    oris      = np.array([c['orientation'] for c in components])
    cohs      = np.array([c['coherence']   for c in components])

    spatial_dist = cdist(centroids, centroids)
    affinity     = np.zeros((n, n))

    for i in range(n):
        for j in range(i + 1, n):
            if spatial_dist[i, j] > max_dist:
                continue
            sigma_s   = max_dist / 2.5
            spatial_s = np.exp(-spatial_dist[i, j]**2 / (2 * sigma_s**2))
            ori_diff  = min(abs(oris[i] - oris[j]), np.pi - abs(oris[i] - oris[j]))
            ori_s     = np.cos(2 * ori_diff)
            if ori_s < -0.2:
                continue
            ori_norm   = (ori_s + 1) / 2
            coh_weight = 0.5 + 0.5 * cohs[i] * cohs[j]
            affinity[i, j] = affinity[j, i] = (ori_weight * ori_norm + spatial_weight * spatial_s) * coh_weight

    return affinity

def cluster_components(components, affinity):
    n = len(components)
    if n < 2: return [0] * n
    if n == 2: return [0, 1]

    affinity_stable = affinity + np.eye(n) * 0.01

    if n < 5:
        features = np.array([[np.cos(2 * c['orientation']), np.sin(2 * c['orientation'])] for c in components])
        try:
            return KMeans(n_clusters=2, n_init=20, random_state=42).fit_predict(features).tolist()
        except:
            return [0] * n
    try:
        sc = SpectralClustering(n_clusters=2, affinity='precomputed',
                                n_init=30, assign_labels='kmeans', random_state=42)
        return sc.fit_predict(affinity_stable).tolist()
    except:
        features = []
        max_cy = max(c['centroid'][0] for c in components) + 1
        max_cx = max(c['centroid'][1] for c in components) + 1
        for c in components:
            ori = c['orientation']
            features.append([np.cos(2*ori)*2, np.sin(2*ori)*2,
                              c['centroid'][1]/max_cx*0.5, c['centroid'][0]/max_cy*0.5])
        try:
            return KMeans(n_clusters=2, n_init=20, random_state=42).fit_predict(np.array(features)).tolist()
        except:
            return [0] * n

def spatial_fallback_split(binary):
    h, w   = binary.shape
    ys, xs = np.where(binary > 0)
    sep_1  = np.zeros((h, w), dtype=np.uint8)
    sep_2  = np.zeros((h, w), dtype=np.uint8)
    if len(xs) == 0:
        return sep_1, sep_2
    if np.std(xs) >= np.std(ys):
        mid = np.median(xs)
        sep_1[(binary > 0) & (np.arange(w)[None, :] <  mid)] = 255
        sep_2[(binary > 0) & (np.arange(w)[None, :] >= mid)] = 255
    else:
        mid = np.median(ys)
        sep_1[(binary > 0) & (np.arange(h)[:, None] <  mid)] = 255
        sep_2[(binary > 0) & (np.arange(h)[:, None] >= mid)] = 255
    return sep_1, sep_2

def reconstruct_full_ridges(components, labels, binary, thinned):
    h, w       = binary.shape
    skel_mask0 = np.zeros((h, w), dtype=np.uint8)
    skel_mask1 = np.zeros((h, w), dtype=np.uint8)

    for comp, label in zip(components, labels):
        if label == 0: skel_mask0[comp['thinned_mask']] = 1
        else:          skel_mask1[comp['thinned_mask']] = 1

    if skel_mask0.sum() == 0 or skel_mask1.sum() == 0:
        return spatial_fallback_split(binary)

    dist0 = ndimage.distance_transform_edt(1 - skel_mask0)
    dist1 = ndimage.distance_transform_edt(1 - skel_mask1)

    ridge  = binary > 0
    sep_1  = np.zeros((h, w), dtype=np.uint8)
    sep_2  = np.zeros((h, w), dtype=np.uint8)
    sep_1[ridge & (dist0 <= dist1)] = 255
    sep_2[ridge & (dist0  > dist1)] = 255

    return sep_1, sep_2

def refine_boundary(sep_1, sep_2, enhanced, block_size=12, iterations=3):
    h, w = enhanced.shape
    gx   = cv2.Sobel(enhanced.astype(np.float64), cv2.CV_64F, 1, 0, ksize=3)
    gy   = cv2.Sobel(enhanced.astype(np.float64), cv2.CV_64F, 0, 1, ksize=3)

    for _ in range(iterations):
        kernel    = np.ones((block_size, block_size), np.uint8)
        dil1      = cv2.dilate(sep_1, kernel, iterations=1)
        dil2      = cv2.dilate(sep_2, kernel, iterations=1)
        boundary  = cv2.bitwise_and(dil1, dil2)
        if boundary.sum() == 0:
            break

        def region_ori(sep, bnd):
            interior = cv2.bitwise_and(sep, cv2.bitwise_not(bnd))
            if interior.sum() < 100: return None
            iy, ix = np.where(interior > 0)
            vx = np.sum(2 * gx[iy, ix] * gy[iy, ix])
            vy = np.sum(gx[iy, ix]**2 - gy[iy, ix]**2)
            return 0.5 * np.arctan2(vx, vy) % np.pi

        ori1 = region_ori(sep_1, boundary)
        ori2 = region_ori(sep_2, boundary)
        if ori1 is None or ori2 is None:
            break

        hbs  = block_size // 2
        by, bx = np.where((boundary > 0) & ((sep_1 > 0) | (sep_2 > 0)))
        for y, x in zip(by, bx):
            y1, y2 = max(0, y-hbs), min(h, y+hbs+1)
            x1, x2 = max(0, x-hbs), min(w, x+hbs+1)
            lvx = np.sum(2 * gx[y1:y2, x1:x2] * gy[y1:y2, x1:x2])
            lvy = np.sum(gx[y1:y2, x1:x2]**2 - gy[y1:y2, x1:x2]**2)
            if abs(lvx) < 1e-6 and abs(lvy) < 1e-6: continue
            lori = 0.5 * np.arctan2(lvx, lvy) % np.pi
            d1 = min(abs(lori - ori1), np.pi - abs(lori - ori1))
            d2 = min(abs(lori - ori2), np.pi - abs(lori - ori2))
            if d2 < d1 * 0.6 and sep_1[y, x] > 0:
                sep_1[y, x] = 0; sep_2[y, x] = 255
            elif d1 < d2 * 0.6 and sep_2[y, x] > 0:
                sep_2[y, x] = 0; sep_1[y, x] = 255

    return sep_1, sep_2

def clean_separation(sep, min_size=20):
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(sep, 8)
    cleaned = np.zeros_like(sep)
    for i in range(1, num_labels):
        if stats[i, cv2.CC_STAT_AREA] >= min_size:
            cleaned[labels == i] = 255
    return cleaned