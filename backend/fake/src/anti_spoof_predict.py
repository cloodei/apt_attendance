import os
import cv2
import math
import torch
import numpy as np
import torch.nn.functional as F
from fake.src.data_io import transform as trans
from fake.src.utility import get_kernel, parse_model_name
from fake.src.model_lib.MiniFASNet import MiniFASNetV1, MiniFASNetV1SE, MiniFASNetV2, MiniFASNetV2SE

MODEL_MAPPING = {
    'MiniFASNetV1': MiniFASNetV1,
    'MiniFASNetV2': MiniFASNetV2,
    'MiniFASNetV1SE': MiniFASNetV1SE,
    'MiniFASNetV2SE': MiniFASNetV2SE
}
deploy = "fake/src/resources/detection_model/deploy.prototxt"
caffemodel = "fake/src/resources/detection_model/Widerface-RetinaFace.caffemodel"

class Detection:
    def __init__(self):
        self.detector = cv2.dnn.readNetFromCaffe(deploy, caffemodel)
        self.detector_confidence = 0.6

    def get_bbox(self, img):
        height, width = img.shape[:2]
        aspect_ratio = width / height
        if width * height >= 192 * 192:
            img = cv2.resize(
                img,
                (int(192 * math.sqrt(aspect_ratio)), int(192 / math.sqrt(aspect_ratio))),
                interpolation=cv2.INTER_LINEAR
            )
        blob = cv2.dnn.blobFromImage(img, 1, mean=(104, 117, 123))
        self.detector.setInput(blob, 'data')
        out = self.detector.forward('detection_out').squeeze()
        max_conf_index = np.argmax(out[:, 2])
        left, top, right, bottom = (
            out[max_conf_index, 3] * width,
            out[max_conf_index, 4] * height,
            out[max_conf_index, 5] * width,
            out[max_conf_index, 6] * height
        )
        bbox = [int(left), int(top), int(right - left + 1), int(bottom - top + 1)]
        return bbox


class AntiSpoofPredict(Detection):
    def __init__(self, device_id):
        super().__init__()
        self.device = torch.device(f"cuda:{device_id}" if torch.cuda.is_available() else "cpu")

    def _load_model(self, model_path):
        model_name = os.path.basename(model_path)
        h_input, w_input, model_type, _ = parse_model_name(model_name)
        self.kernel_size = get_kernel(h_input, w_input)
        self.model = MODEL_MAPPING[model_type](conv6_kernel=self.kernel_size).to(self.device)

        state_dict = torch.load(model_path, map_location=self.device)
        if list(state_dict.keys())[0].startswith("module."):
            state_dict = {k.replace("module.", ""): v for k, v in state_dict.items()}

        self.model.load_state_dict(state_dict, strict=False)

    def predict(self, img, model_path):
        test_transform = trans.Compose([trans.ToTensor()])
        img = test_transform(img)
        img = img.unsqueeze(0).to(self.device)

        self._load_model(model_path)
        self.model.eval()
        with torch.inference_mode():
            result = self.model(img)
            result = F.softmax(result, dim=1).cpu().numpy()
        return result










