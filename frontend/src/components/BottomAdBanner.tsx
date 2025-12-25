import { useEffect, useRef } from "react";

/**
 * 下部固定バナー（iPhone SafeArea対応）
 *
 * ✅ Webで広告を出す場合は AdSense / Google Ad Manager を使うのが基本。
 * ✅ ここでは AdSense を想定した枠を用意し、AdMobユニットIDは保持しておく。
 *
 * AdMob Unit ID (for iOS/Android app SDK):
 *   ca-app-pub-3517487281025314/8255180291
 */
export default function BottomAdBanner({
  height = 60,
  mode = "dummy", // "dummy" | "adsense"
  adsenseClient,
  adsenseSlot,
  admobUnitId, // <- 保持用（Webでは直接使わない）
}: {
  height?: number;
  mode?: "dummy" | "adsense";
  adsenseClient?: string; // ca-pub-xxxx
  adsenseSlot?: string; // "1234567890"
  admobUnitId?: string; // ca-app-pub-.../...
}) {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (mode !== "adsense") return;
    if (pushedRef.current) return;

    // @ts-ignore
    const w = window as any;
    if (!w.adsbygoogle) return;

    try {
      w.adsbygoogle.push({});
      pushedRef.current = true;
    } catch {
      // ignore
    }
  }, [mode]);

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: "white",
        borderTop: "1px solid rgba(0,0,0,0.10)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {mode === "adsense" ? (
          <ins
            className="adsbygoogle"
            style={{ display: "block", width: "100%", height }}
            data-ad-client={adsenseClient}
            data-ad-slot={adsenseSlot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        ) : (
          <div style={{ fontSize: 12, opacity: 0.7, textAlign: "center" }}>
            Banner Ad (dummy)
            {admobUnitId ? (
              <div style={{ marginTop: 4, fontSize: 11, opacity: 0.7 }}>
                AdMob Unit: {admobUnitId}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
