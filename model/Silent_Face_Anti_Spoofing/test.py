import faiss
import cv2
import numpy as np
import joblib
from PIL import Image
import torch
from torchvision import transforms
from facenet_pytorch import MTCNN, InceptionResnetV1
from collections import deque
from src.anti_spoof_predict import AntiSpoofPredict
from src.generate_patches import CropImage

def predict_one_faiss_k1(index, x):
    x = x.reshape(1, -1).astype('float32')
    D, I = index.search(x, 1)
    idx = I[0][0]
    dist = D[0][0]
    label = y_train[idx]
    similarity = 1 / (1 + dist)
    return label, similarity

MSV_TO_NAME = {
    "7": "Nguyen_Van_Tuan",
    "8": "Nguyen_Viet_Quoc_An",
    "6": "Nguyen_Van_Minh",
    "13": "Nguyen_Thi_Phuong_Thao",
    "11": "Nguyen_Thi_Hong_Mai",
    "10": "Nguyen_Thi_Cam_Ly",
    "9": "Nguyen_The_Truong",
    "5": "Nguyen_Phu_Nguyen",
    "4": "Nguyen_Phong_Hai",
    "12": "Nguyen_Ha_Phuong_Uyen",
    "1": "Nguyen_Duy_Hoang",
    "2": "Nguyen_Duc_Phong",
    "14": "Mai_Thanh_Thu",
    "3": "Le_Duc_Nguyen",
    "Unknown": "unknown"
}

anti_spoof = AntiSpoofPredict(device_id=0)
model_path = "D:\\Newfolder\\yp\\apt_attendance\\model\\Silent_Face_Anti_Spoofing\\src\\resources\\anti_spoof_models\\2.7_80x80_MiniFASNetV2.pth"
image_cropper = CropImage()
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

mtcnn = MTCNN(keep_all=True, device=device)
resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)

model = faiss.read_index("../models/faiss_model/faiss_index.index")
y_train = joblib.load("../models/faiss_model/faiss_labels.pkl")

preprocess = transforms.Compose([
    transforms.Resize((160, 160)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
])

url = "http://10.2.88.228:8080/video"
prediction_queue = deque(maxlen=5)
final_list = []

while True:
    ret, frame = cv2.VideoCapture(url).read()
    frame = cv2.resize(frame, None, fx=0.5, fy=0.5)
    img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))

    boxes, probs = mtcnn.detect(img)
    if boxes is not None:
        h, w, _ = frame.shape
        for box, prob in zip(boxes, probs):
            if prob is None or prob < 0.9:
                continue

            x1, y1, x2, y2 = [int(b) for b in box]
            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(w, x2)
            y2 = min(h, y2)
        
            if x2 <= x1 or y2 <= y1:
                continue

            face_img = frame[y1:y2, x1:x2]
            if face_img.size == 0:
                continue
            
            param = {
                "org_img": frame,
                "bbox": [x1, y1, x2 - x1, y2 - y1],
                "scale": 2.7,
                "out_w": 80,
                "out_h": 80,
                "crop": True,
            }
            
            img_for_anti_spoof = image_cropper.crop(**param)

            prediction_spoof = anti_spoof.predict(img_for_anti_spoof, model_path)
            label_spoof = np.argmax(prediction_spoof)
            color = (0, 255, 0)
            
            if label_spoof == 1:
                face_pil = Image.fromarray(cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB))
                face_tensor = preprocess(face_pil).unsqueeze(0).to(device)

                face_embedding = resnet(face_tensor).detach().cpu().numpy()
                labels, similarity = predict_one_faiss_k1(model, face_embedding)

                if similarity < 0.65:  
                    name = "Unknown"
                    color = (0, 255, 255)
                else:
                    name = MSV_TO_NAME.get(str(labels), "Null")
                    print(name + " " + str(similarity))
                    prediction_queue.append(name)
            else:
                name = "Bad"
                color = (0, 0, 255)

            if len(prediction_queue) == 5:
                prediction_queue.clear()

            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, name, (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
