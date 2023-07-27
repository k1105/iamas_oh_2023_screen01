import dynamic from "next/dynamic";
import p5Types from "p5";
import { MutableRefObject, Dispatch, SetStateAction } from "react";
import { Hand } from "@tensorflow-models/hand-pose-detection";
import { getSmoothedHandpose } from "../lib/getSmoothedHandpose";
import { updateHandposeHistory } from "../lib/updateHandposeHistory";
import { Keypoint } from "@tensorflow-models/hand-pose-detection";
import { convertHandToHandpose } from "../lib/converter/convertHandToHandpose";
import { updateStyleIndex } from "../lib/updateStyleIndex";
import { circleIndicator } from "../lib/p5/circleIndicator";
import { LostManager } from "../lib/LostManagerClass";

type Props = {
  handpose: MutableRefObject<Hand[]>;
  setScene: Dispatch<SetStateAction<number>>;
  scene: number;
};

type Handpose = Keypoint[];

const Sketch = dynamic(import("react-p5"), {
  loading: () => <></>,
  ssr: false,
});

export const CircleUnitTower = ({ handpose, scene, setScene }: Props) => {
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
    p5.noStroke();
    p5.fill(255);
    p5.strokeWeight(10);
  };

  const draw = (p5: p5Types) => {
    setScene(updateStyleIndex(lost, scene, 3));

    const rawHands: {
      left: Handpose;
      right: Handpose;
    } = convertHandToHandpose(handpose.current);
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

    if (hands.left.length > 0) {
      p5.push();
      p5.translate(p5.width / 2 - 300, p5.height / 2 + 300);
      let totalHeight = 0;
      for (let i = 0; i < 5; i++) {
        const dist = hands.left[4 * i + 4].y - hands.left[4 * i + 1].y;
        p5.ellipse(0, dist + totalHeight, 2 * dist);
        totalHeight += 2 * dist;
      }
      p5.pop();
    }
    if (hands.right.length > 0) {
      p5.push();
      p5.translate(p5.width / 2 + 300, p5.height / 2 + 300);
      let totalHeight = 0;
      for (let i = 0; i < 5; i++) {
        const dist = hands.right[4 * i + 4].y - hands.right[4 * i + 1].y;
        p5.ellipse(0, dist + totalHeight, 2 * dist);
        totalHeight += 2 * dist;
      }
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
