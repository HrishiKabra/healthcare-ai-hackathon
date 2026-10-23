"use client";

import { BodyMapWidget } from "./BodyMap";
import { ChoiceWidget } from "./Choice";
import { DurationWidget } from "./Duration";
import { FreeWidget } from "./Free";
import { InstructionWidget } from "./Instruction";
import { ScaleWidget } from "./Scale";
import type { WidgetProps } from "./types";
import { YesNoWidget } from "./YesNo";

export function AnswerWidget(props: WidgetProps & { onFreeText: (text: string) => void }) {
  // key on question id so widget state (selections) resets for every new question
  const k = props.q.id;
  switch (props.q.answerType) {
    case "yesno":
      return <YesNoWidget key={k} {...props} />;
    case "scale":
      return <ScaleWidget key={k} {...props} />;
    case "bodymap":
      return <BodyMapWidget key={k} {...props} />;
    case "choice":
      return <ChoiceWidget key={k} {...props} />;
    case "duration":
      return <DurationWidget key={k} {...props} />;
    case "free":
      return <FreeWidget key={k} {...props} />;
    case "instruction":
      return <InstructionWidget key={k} {...props} />;
  }
}
