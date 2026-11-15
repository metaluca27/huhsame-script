import cv2, numpy as np, json, sys
orig = cv2.imread(sys.argv[1]); ren = cv2.imread(sys.argv[2])
g1 = cv2.cvtColor(orig, cv2.COLOR_BGR2GRAY); g2 = cv2.cvtColor(ren, cv2.COLOR_BGR2GRAY)
sift = cv2.SIFT_create(6000)
k1, d1 = sift.detectAndCompute(g1, None); k2, d2 = sift.detectAndCompute(g2, None)
m = cv2.BFMatcher().knnMatch(d1, d2, k=2)
good = [a for a, b in m if a.distance < 0.75 * b.distance]
p1 = np.float32([k1[x.queryIdx].pt for x in good]); p2 = np.float32([k2[x.trainIdx].pt for x in good])
M, inl = cv2.estimateAffinePartial2D(p1, p2, method=cv2.RANSAC, ransacReprojThreshold=12)
s = float(np.hypot(M[0,0], M[1,0])); rot = float(np.degrees(np.arctan2(M[1,0], M[0,0])))
print(json.dumps({"good": len(good), "inliers": int(inl.sum()), "scale": s, "rot_deg": rot, "tx": float(M[0,2]), "ty": float(M[1,2]),
  "orig": [orig.shape[1], orig.shape[0]], "render": [ren.shape[1], ren.shape[0]]}))
# preview: original warped into the render frame, blended 50/50
w = cv2.warpAffine(orig, M, (ren.shape[1], ren.shape[0]))
cv2.imwrite(sys.argv[3], np.hstack([ren, w, cv2.addWeighted(ren, 0.5, w, 0.5, 0)]))
