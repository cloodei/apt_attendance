import faiss
import cv2
import joblib
from PIL import Image
import torch
from torchvision import transforms
from facenet_pytorch import MTCNN, InceptionResnetV1
from collections import deque, Counter

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
mtcnn = MTCNN(keep_all=True, device=device)
resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)

model = faiss.read_index("models/faiss_model/faiss_index.index")
y_train = joblib.load("models/faiss_model/faiss_labels.pkl")

preprocess = transforms.Compose([
    transforms.Resize((160, 160)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
])

def predict_one_faiss_k1(index, x):
    x = x.reshape(1, -1).astype('float32')
    D, I = index.search(x, 1)
    idx = I[0][0]
    dist = D[0][0]
    label = y_train[idx]
    similarity = 1 / (1 + dist)
    return label, similarity

MSV_TO_NAME = {
    "1": "Nguyen_Duy_Hoang",
    "2": "Nguyen_Duc_Phong",
    "3": "Le_Duc_Nguyen",
    "4": "Nguyen_Phong_Hai",
    "5": "Nguyen_Phu_Nguyen",
    "6": "Nguyen_Van_Minh",
    "7": "Nguyen_Van_Tuan",
    "8": "Nguyen_Viet_Quoc_An",
    "9": "Nguyen_The_Truong",
    "10": "Nguyen_Thi_Cam_Ly",
    "11": "Nguyen_Thi_Hong_Mai",
    "12": "Nguyen_Ha_Phuong_Uyen",
    "13": "Nguyen_Thi_Phuong_Thao",
    "14": "Mai_Thanh_Thu",
}

url = "http://10.2.88.228:8080/video"
prediction_queue: deque[str] = deque(maxlen=5)

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
            x1 = max(0, x1); y1 = max(0, y1)
            x2 = min(w, x2); y2 = min(h, y2)

            if x2 <= x1 or y2 <= y1:
                continue

            face_img = frame[y1:y2, x1:x2]
            if face_img.size == 0:
                continue

            face_pil = Image.fromarray(cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB))
            face_tensor = preprocess(face_pil).unsqueeze(0).to(device)

            face_embedding = resnet(face_tensor).detach().cpu().numpy()

            labels, similarity = predict_one_faiss_k1(model, face_embedding)

            if similarity < 0.65:  
                name = "Unknown"
            else:
                name = MSV_TO_NAME.get(str(labels), "Unknown")
                prediction_queue.append(name)
  
            if len(prediction_queue) == 5:
                x = Counter(prediction_queue).most_common(1)
                print(x)
                prediction_queue.clear()

            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(frame, name, (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (36, 255, 12), 2)

    cv2.imshow("Face Recognition", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cv2.destroyAllWindows()
