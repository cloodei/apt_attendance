import cv2
import joblib
from PIL import Image
import torch
from facenet_pytorch import MTCNN, InceptionResnetV1


def is_valid_landmarks(landmarks):
    left_eye, right_eye, nose, mouth_left, mouth_right = landmarks

    eye_diff_y = abs(left_eye[1] - right_eye[1])
    eye_dist_x = abs(left_eye[0] - right_eye[0])

    if eye_dist_x == 0:
        return False
    if eye_diff_y > 0.25 * eye_dist_x:
        return False
    if not (min(left_eye[0], right_eye[0]) < nose[0] < max(left_eye[0], right_eye[0])):
        return False
    if not (mouth_left[1] > nose[1] and mouth_right[1] > nose[1]):
        return False

    return True

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
    "3": "Le_Duc_Nguyen"
}

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print("Device:", device)

mtcnn = MTCNN(keep_all=True, device=device)
resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)
classifier = joblib.load("models/svm_model.pkl")
url = "http://10.2.88.228:8080/video"

while True:
    ret, frame = cv2.VideoCapture(url).read()
    frame = cv2.resize(frame, None, fx=0.5, fy=0.5)
    img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    boxes, probs, landmarks = mtcnn.detect(img, landmarks=True)

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

            face_pil = Image.fromarray(cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB))
            face_tensor = mtcnn(face_pil)
            if face_tensor is None:
                continue

            if face_tensor.ndim == 3:
                face_tensor = face_tensor.unsqueeze(0)

            face_embedding = resnet(face_tensor.to(device)).detach().cpu().numpy()
            pred = classifier.predict(face_embedding)
            name = MSV_TO_NAME.get(str(pred[0]), "Unknown")

            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(frame, name, (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (36, 255, 12), 2)

    cv2.imshow("Face Recognition", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cv2.destroyAllWindows()
