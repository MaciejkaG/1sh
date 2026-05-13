"use client";

import { useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const ALPHA2_TO_NUMERIC: Record<string, number> = {
  AF: 4, AL: 8, DZ: 12, AD: 20, AO: 24, AG: 28, AR: 32, AM: 51, AU: 36, AT: 40,
  AZ: 31, BS: 44, BH: 48, BD: 50, BB: 52, BY: 112, BE: 56, BZ: 84, BJ: 204,
  BT: 64, BO: 68, BA: 70, BW: 72, BR: 76, BN: 96, BG: 100, BF: 854, BI: 108,
  KH: 116, CM: 120, CA: 124, CV: 132, CF: 140, TD: 148, CL: 152, CN: 156,
  CO: 170, KM: 174, CG: 178, CD: 180, CR: 188, CI: 384, HR: 191, CU: 192,
  CY: 196, CZ: 203, DK: 208, DJ: 262, DM: 212, DO: 214, EC: 218, EG: 818,
  SV: 222, GQ: 226, ER: 232, EE: 233, ET: 231, FJ: 242, FI: 246, FR: 250,
  GA: 266, GM: 270, GE: 268, DE: 276, GH: 288, GR: 300, GD: 308, GT: 320,
  GN: 324, GW: 624, GY: 328, HT: 332, HN: 340, HK: 344, HU: 348, IS: 352,
  IN: 356, ID: 360, IR: 364, IQ: 368, IE: 372, IL: 376, IT: 380, JM: 388,
  JP: 392, JO: 400, KZ: 398, KE: 404, KI: 296, KP: 408, KR: 410, KW: 414,
  KG: 417, LA: 418, LV: 428, LB: 422, LS: 426, LR: 430, LY: 434, LI: 438,
  LT: 440, LU: 442, MO: 446, MK: 807, MG: 450, MW: 454, MY: 458, MV: 462,
  ML: 466, MT: 470, MH: 584, MR: 478, MU: 480, MX: 484, FM: 583, MD: 498,
  MC: 492, MN: 496, ME: 499, MA: 504, MZ: 508, MM: 104, NA: 516, NR: 520,
  NP: 524, NL: 528, NZ: 554, NI: 558, NE: 562, NG: 566, NO: 578, OM: 512,
  PK: 586, PW: 585, PA: 591, PG: 598, PY: 600, PE: 604, PH: 608, PL: 616,
  PT: 620, QA: 634, RO: 642, RU: 643, RW: 646, KN: 659, LC: 662, VC: 670,
  WS: 882, SM: 674, ST: 678, SA: 682, SN: 686, RS: 688, SC: 690, SL: 694,
  SG: 702, SK: 703, SI: 705, SB: 90, SO: 706, ZA: 710, SS: 728, ES: 724,
  LK: 144, SD: 729, SR: 740, SZ: 748, SE: 752, CH: 756, SY: 760, TW: 158,
  TJ: 762, TZ: 834, TH: 764, TL: 626, TG: 768, TO: 776, TT: 780, TN: 788,
  TR: 792, TM: 795, TV: 798, UG: 800, UA: 804, AE: 784, GB: 826, US: 840,
  UY: 858, UZ: 860, VU: 548, VE: 862, VN: 704, YE: 887, ZM: 894, ZW: 716,
};

interface Props {
  countries: { country: string | null; count: number }[];
}

export function CountryMap({ countries }: Props) {
  const [tooltip, setTooltip] = useState<{ name: string; count: number; x: number; y: number } | null>(null);

  const maxCount = Math.max(...countries.map((c) => c.count), 1);

  const clickMap = new Map<string, { count: number; code: string }>();
  for (const c of countries) {
    if (c.country && ALPHA2_TO_NUMERIC[c.country] !== undefined) {
      clickMap.set(String(ALPHA2_TO_NUMERIC[c.country]), { count: c.count, code: c.country });
    }
  }

  return (
    <div className="relative">
      <ComposableMap
        projectionConfig={{ scale: 147 }}
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const entry = clickMap.get(String(geo.id));
              const clicks = entry?.count ?? 0;
              const intensity = clicks > 0 ? 0.2 + (clicks / maxCount) * 0.8 : 0;
              const fill =
                clicks > 0
                  ? `rgba(99, 102, 241, ${intensity})`
                  : "rgba(156, 163, 175, 0.25)";

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth={0.5}
                  onMouseEnter={(e) => {
                    if (clicks > 0) {
                      setTooltip({
                        name: geo.properties.name ?? entry?.code ?? "Unknown",
                        count: clicks,
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  style={{
                    default: { outline: "none" },
                    hover: {
                      fill: clicks > 0 ? "rgba(79, 70, 229, 0.9)" : "rgba(156, 163, 175, 0.4)",
                      outline: "none",
                      cursor: clicks > 0 ? "pointer" : "default",
                    },
                    pressed: { outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 text-xs rounded shadow-md pointer-events-none bg-popover text-popover-foreground border"
          style={{ left: tooltip.x + 12, top: tooltip.y - 28 }}
        >
          <span className="font-semibold">{tooltip.name}</span>{" "}
          <span className="text-muted-foreground">— {tooltip.count} click{tooltip.count !== 1 ? "s" : ""}</span>
        </div>
      )}
    </div>
  );
}
