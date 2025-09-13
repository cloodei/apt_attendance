import cv2
from PIL import Image
from facenet_pytorch import MTCNN

mtcnn = MTCNN(keep_all=True)

# url = "http://10.2.87.162:8080/shot.jpg"
url = "http://10.2.88.228:8080/shot.jpg"
# url = "http://10.2.88.228:8080/video"

something = None

while True:
    # img_resp = requests.get(url)
    # img_arr = np.array(bytearray(img_resp.content), dtype=np.uint8)
    # frame = cv2.imdecode(img_arr, -1)

    ret, frame = cv2.VideoCapture(url).read()
    frame = cv2.resize(frame, None, fx=0.5, fy=0.5)
    img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    boxes, probs = mtcnn.detect(img)

    if boxes is not None:
        for box, prob in zip(boxes, probs):
            if prob > 0.7:
                x1, y1, x2, y2 = [int(b) for b in box]
                something = cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

    cv2.imshow("MTCNN Face Detection", something if something is not None else frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cv2.destroyAllWindows()
