import { DarkSoulsHoloCard } from "@designcodeio/threeui";
import "@designcodeio/threeui/style.css";

export function Scene() {
  return (
    <div className="shader-frame" style={{ width: "100%", height: "100%", position: "relative" }}>
      <DarkSoulsHoloCard
        variant="ashen-one"
      />
    </div>
  );
}
