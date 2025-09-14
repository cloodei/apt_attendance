import os
import cv2
import numpy as np
import argparse
import warnings
import time

from src.anti_spoof_predict import AntiSpoofPredict
from src.generate_patches import CropImage
from src.utility import parse_model_name

warnings.filterwarnings('ignore')
SAMPLE_IMAGE_PATH = "./images/sample/"

def test(image_name: str, model_dir: str, device_id: int):
    model_test = AntiSpoofPredict(device_id)
    image_cropper = CropImage()
    image_path = os.path.join(SAMPLE_IMAGE_PATH, image_name)
    image = cv2.imread(image_path)
    if image is None:
        print(f"Cannot read image: {image_path}")
        return

    image_bbox = model_test.get_bbox(image)
    prediction = np.zeros((1, 3), dtype=np.float32)
    test_speed = 0.0

    for model_name in os.listdir(model_dir):
        model_path = os.path.join(model_dir, model_name)
        h_input, w_input, model_type, scale = parse_model_name(model_name)
        param = {
            "org_img": image,
            "bbox": image_bbox,
            "scale": scale,
            "out_w": w_input,
            "out_h": h_input,
            "crop": True,
        }
        if scale is None:
            param["crop"] = False

        img_crop = image_cropper.crop(**param)
        start = time.time()
        prediction += model_test.predict(img_crop, model_path)
        test_speed += time.time() - start

    label = int(np.argmax(prediction))
    value = float(prediction[0][label] / 2.0)
    color = (255, 0, 0) if label == 1 else (0, 0, 255)
    result_text = f"{'RealFace' if label == 1 else 'FakeFace'} Score: {value:.2f}"
    print(f"Image '{image_name}' prediction: {result_text}")
    print(f"Prediction cost {test_speed:.2f}s")

    x, y, w, h = image_bbox
    cv2.rectangle(image, (x, y), (x + w, y + h), color, 2)
    cv2.putText(
        image,
        result_text,
        (x, max(y - 5, 0)),
        cv2.FONT_HERSHEY_COMPLEX,
        float(0.5 * image.shape[0] / 1024.0),
        color,
        1,
        cv2.LINE_AA,
    )

    save_path = os.path.join(SAMPLE_IMAGE_PATH, f"{os.path.splitext(image_name)[0]}_result.jpg")
    cv2.imwrite(save_path, image)
    print(f"Result saved: {save_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Silent-Face test script")
    parser.add_argument("--device_id", type=int, default=0, help="GPU id")
    parser.add_argument("--model_dir", type=str, default="./resources/anti_spoof_models")
    parser.add_argument("--image_name", type=str, default="image_F1.jpg")
    args = parser.parse_args()
    test(args.image_name, args.model_dir, args.device_id)


