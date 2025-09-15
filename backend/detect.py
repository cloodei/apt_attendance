import cv2
import faiss
import torch
import joblib
import numpy as np
from PIL import Image
from torchvision import transforms
from collections import deque, Counter
from facenet_pytorch import MTCNN, InceptionResnetV1
from fake.src.generate_patches import CropImage
from fake.src.anti_spoof_predict import AntiSpoofPredict

anti_spoof = AntiSpoofPredict(device_id=0)
model_path = "fake/src/resources/anti_spoof_models/2.7_80x80_MiniFASNetV2.pth"
image_cropper = CropImage()
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

prediction_queue = deque(maxlen=5)
final_list = []

def predict_one_faiss_k1(index, x):
    x = x.reshape(1, -1).astype('float32')
    D, I = index.search(x, 1)
    idx = I[0][0]
    dist = D[0][0]
    label = y_train[idx]
    similarity = 1 / (1 + dist)
    return label, similarity

def detect_faces(frame: cv2.typing.MatLike, students_list: dict[int, str]):
    """
    Detects faces in a given frame, draws bounding boxes, and returns the frame.
    This is a blocking, CPU-bound function.
    """
    frame = cv2.resize(frame, None, fx=0.5, fy=0.5)
    img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    boxes, probs = mtcnn.detect(img)

    if boxes is None:
        return frame, None

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
                name = students_list.get(labels, "Unknown")
                if name == "Unknown":
                    color = (0, 0, 255)
                prediction_queue.append(labels)
        else:
            name = "Bad"
            color = (0, 0, 255)

        if len(prediction_queue) == 5:
            attendee_id = Counter(prediction_queue).most_common(1)[0][0]
            prediction_queue.clear()
            return frame, {"attendee_id": int(attendee_id), "confidence": similarity}

        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        # cv2.putText(frame, name, (x1, y1-10), cv2.QT_FONT_NORMAL, 0.9, color, 2)

    return frame, None
