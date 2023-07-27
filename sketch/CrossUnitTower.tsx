import dynamic from "next/dynamic";
import p5Types from "p5";
import { MutableRefObject, Dispatch, SetStateAction } from "react";
import { Hand } from "@tensorflow-models/hand-pose-detection";
import { getSmoothedHandpose } from "../lib/getSmoothedHandpose";
import { updateHandposeHistory } from "../lib/updateHandposeHistory";
import { Keypoint } from "@tensorflow-models/hand-pose-detection";
import { convertHandToHandpose } from "../lib/converter/convertHandToHandpose";
import { circleIndicator } from "../lib/p5/circleIndicator";
import { LostManager } from "../lib/LostManagerClass";

type Props = {
  handpose: MutableRefObject<Hand[]>;
  setScene: Dispatch<SetStateAction<number>>;
  scene: number;
};

type Handpose = Keypoint[];

const lineLength = 50;

const Sketch = dynamic(import("react-p5"), {
  loading: () => <></>,
  ssr: false,
});

export const CrossUnitTower = ({ handpose, scene, setScene }: Props) => {
  let handposeHistory: {
    left: Handpose[];
    right: Handpose[];
  } = { left: [], right: [] };
  let lost = new LostManager();
  let detectedOnce = false;

  const preload = (p5: p5Types) => {
    // 画像などのロードを行う
  };

  const setup = (p5: p5Types, canvasParentRef: Element) => {
    p5.createCanvas(p5.windowWidth, p5.windowHeight).parent(canvasParentRef);
    p5.stroke(220);
    p5.fill(255);
    p5.strokeWeight(3);
  };

  const draw = (p5: p5Types) => {
    const rawHands: {
      left: Handpose;
      right: Handpose;
    } = convertHandToHandpose(handpose.current); //平滑化されていない手指の動きを使用する
    handposeHistory = updateHandposeHistory(rawHands, handposeHistory); //handposeHistoryの更新
    const hands: {
      left: Handpose;
      right: Handpose;
    } = getSmoothedHandpose(rawHands, handposeHistory); //平滑化された手指の動きを取得する

    p5.clear();
    /**
     * handle lost and scene
     **/

    if (handpose.current.length > 0) {
      detectedOnce = true;
    }
    if (detectedOnce) {
      lost.update(handpose.current);
      if (lost.state) {
        p5.push();
        p5.translate(p5.width - 100, 100);
        circleIndicator({
          p5,
          ratio: (new Date().getTime() - lost.at) / 2000,
          text: "きりかわるまで",
        });
        p5.pop();
        if ((new Date().getTime() - lost.at) / 2000 > 1) {
          setScene((scene + 1) % 3);
        }
      }
    }
    /**
     * handle lost and scene
     **/
    if (hands.left.length > 0 || hands.right.length > 0) {
      if (hands.left.length == 0) {
        hands.left = hands.right;
      } else if (hands.right.length == 0) {
        hands.right = hands.left;
      }
    }

    if (hands.left.length > 0) {
      p5.push();
      p5.translate(p5.width / 2 - lineLength * 5, window.innerHeight / 2 + 300);
      drawPiledFingers(p5, hands.left);
      p5.pop();
    }
    if (hands.right.length > 0) {
      p5.push();
      p5.translate(p5.width / 2 + lineLength * 5, window.innerHeight / 2 + 300);
      drawPiledFingers(p5, hands.right);
      p5.pop();
    }
  };

  const windowResized = (p5: p5Types) => {
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
  };

  return (
    <>
      <Sketch
        preload={preload}
        setup={setup}
        draw={draw}
        windowResized={windowResized}
      />
    </>
  );
};

const drawPiledFingers = (p5: p5Types, hand: Handpose) => {
  let start;
  let end;

  const dList = [];

  for (let n = 0; n < 5; n++) {
    start = 4 * n + 1;
    end = 4 * n + 4;
    dList.push(
      Math.min(Math.max((hand[start].y - hand[end].y) / 50, 0), Math.PI / 2)
    );
  }

  for (let index = 0; index < 2; index++) {
    p5.push();
    p5.line(0, 0, (-1) ** index * lineLength * Math.cos(dList[0]), -15);
    p5.translate(0, -15);
    for (let n = 0; n < 5; n++) {
      p5.push(); //1
      p5.push(); //2
      p5.translate(0, -lineLength * Math.sin(dList[n]));
      p5.push(); //3
      p5.rotate((-1) ** index * dList[n]);
      p5.line(-lineLength, 0, lineLength, 0);
      p5.pop(); //3
      p5.pop(); //2
      p5.pop(); //1
      p5.translate(0, -lineLength * 2 * Math.sin(dList[n]));

      if (n < 4) {
        p5.line(
          (-1) ** (index + 1) * lineLength * Math.cos(dList[n]),
          0,
          (-1) ** index * lineLength * Math.cos(dList[n + 1]),
          -30
        );
        p5.translate(0, -30);
      }
    }
    p5.line((-1) ** index * lineLength * Math.cos(dList[4]), 0, 0, -15);
    p5.pop();
  }
};
