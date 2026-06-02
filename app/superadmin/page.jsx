"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import {
  Lock,
  Unlock,
  Shield,
  Sparkles,
  KeyRound,
  ArrowRight,
  LogOut,
  Quote,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

const PIN = "3270";
const SESSION_KEY = "miray_superadmin_unlocked";

function clampDigit(v) {
  const s = String(v ?? "").replace(/\D/g, "");
  return s.slice(0, 1);
}

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

export default function SuperAdminGate() {
  const router = useRouter();
  const vaultControls = useAnimation();
  const panelControls = useAnimation();
  const errorControls = useAnimation();

  const [digits, setDigits] = useState(["", "", "", ""]);
  const [status, setStatus] = useState("idle"); // idle | unlocking | unlocked | error
  const [unlocked, setUnlocked] = useState(false);
  const [navError, setNavError] = useState("");

  const inputsRef = useRef([]);
  const navigatingRef = useRef(false);

  useEffect(() => {
    const ok = sessionStorage.getItem(SESSION_KEY) === "1";
    if (ok) {
      setUnlocked(true);
      setStatus("unlocked");
      // if already unlocked, go straight to manage
      safeNavigate("/superadmin/manage");
      return;
    }
    setTimeout(() => inputsRef.current?.[0]?.focus?.(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pinValue = useMemo(() => digits.join(""), [digits]);
  const isComplete = pinValue.length === 4 && digits.every(Boolean);
  const isRed = status === "error" || !!navError;

  const focusIndex = (i) => inputsRef.current?.[i]?.focus?.();

  const setDigitAt = (i, val) => {
    setDigits((prev) => {
      const next = [...prev];
      next[i] = clampDigit(val);
      return next;
    });
  };

  const onChange = (i, e) => {
    setNavError("");
    const d = clampDigit(e.target.value);
    setDigitAt(i, d);
    if (d && i < 3) focusIndex(i + 1);
  };

  const onKeyDown = (i, e) => {
    if (e.key === "Backspace") {
      if (digits[i]) {
        setDigitAt(i, "");
        return;
      }
      if (i > 0) {
        focusIndex(i - 1);
        setDigitAt(i - 1, "");
      }
    }
    if (e.key === "ArrowLeft" && i > 0) focusIndex(i - 1);
    if (e.key === "ArrowRight" && i < 3) focusIndex(i + 1);
    if (e.key === "Enter") tryUnlockAndGo();
  };

  const onPaste = (e) => {
    setNavError("");
    e.preventDefault();
    const t = (e.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0, 4);
    if (!t) return;
    setDigits([t[0] || "", t[1] || "", t[2] || "", t[3] || ""]);
    if (t.length >= 4) inputsRef.current?.[3]?.blur?.();
  };

  const shake = async (controls) => {
    await controls.start({
      x: [0, -10, 10, -8, 8, -4, 4, 0],
      transition: { duration: 0.45, ease: "easeInOut" },
    });
  };

  const resetDigits = () => {
    setDigits(["", "", "", ""]);
    focusIndex(0);
  };

  const vaultPop = async () => {
    await vaultControls.start({
      rotate: [0, -1.5, 1.5, 0],
      transition: { duration: 0.28, ease: "easeInOut" },
    });
    await vaultControls.start({
      scale: [1, 1.02, 1],
      transition: { duration: 0.35, ease: "easeOut" },
    });
  };

  const showNavFail = async (msg) => {
    setNavError(msg || "Navigation failed. Please try again.");
    setStatus("error");
    await shake(panelControls);
    await shake(errorControls);
    setStatus(unlocked ? "unlocked" : "idle");
  };

  const safeNavigate = async (path) => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;

    try {
      // ✅ Most reliable for "did it actually navigate?"
      // We watch pathname change (Next router doesn't give a promise).
      const startPath = window.location.pathname;

      // Push route
      router.push(path);

      // Wait until pathname changes to target OR timeout
      const ok = await new Promise((resolve) => {
        const start = Date.now();
        const tick = () => {
          const nowPath = window.location.pathname;

          // success if target reached
          if (nowPath === path) return resolve(true);

          // If it changed but not to target (unlikely), treat as fail
          if (nowPath !== startPath && nowPath !== path) return resolve(false);

          if (Date.now() - start > 1800) return resolve(false);
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });

      if (!ok) {
        await showNavFail("Navigation failed. Ensure /superadmin/manage page exists and has no runtime errors.");
      }
    } catch (e) {
      console.error("❌ navigation error:", e);
      await showNavFail(e?.message || "Navigation failed. Please try again.");
    } finally {
      navigatingRef.current = false;
    }
  };

  const tryUnlockAndGo = async () => {
    if (status === "unlocking") return;

    setNavError("");

    if (!isComplete) {
      setStatus("error");
      await shake(panelControls);
      await shake(errorControls);
      setStatus("idle");
      return;
    }

    if (pinValue !== PIN) {
      setStatus("error");
      await shake(panelControls);
      await shake(errorControls);
      setStatus("idle");
      resetDigits();
      return;
    }

    setStatus("unlocking");

    await vaultPop();

    sessionStorage.setItem(SESSION_KEY, "1");
    setUnlocked(true);
    setStatus("unlocked");

    // navigate
    await safeNavigate("/superadmin/manage");
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setUnlocked(false);
    setStatus("idle");
    setNavError("");
    setDigits(["", "", "", ""]);
    setTimeout(() => focusIndex(0), 0);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 relative overflow-hidden">
      {/* Blue/white background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] bg-blue-600/20 blur-[110px] rounded-full" />
        <div className="absolute -bottom-44 -right-44 w-[620px] h-[620px] bg-sky-400/20 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(37,99,235,0.10)_1px,transparent_0)] [background-size:22px_22px] opacity-40" />
      </div>

      <div className="max-w-5xl mx-auto px-5 py-10 relative">
        {/* header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Shield className="text-blue-700" size={20} />
            </div>
            <div>
              <div className="text-sm text-gray-500">OATCLUB Admin Vault</div>
              <div className="text-xl font-semibold">/superadmin</div>
            </div>
          </div>

          {unlocked && (
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 transition"
              title="Lock again"
            >
              <LogOut size={16} />
              Lock
            </button>
          )}
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-7 items-stretch">
          {/* left: vault animation */}
          <motion.div
            animate={vaultControls}
            className={cx(
              "rounded-3xl bg-white/80 backdrop-blur border p-6 sm:p-7 relative overflow-hidden shadow-sm transition-colors",
              isRed ? "border-red-200" : "border-blue-100"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className={cx("text-blue-700", isRed && "text-red-600")} size={18} />
                <span className="text-sm text-gray-600">Secure Access</span>
              </div>

              <div
                className={cx(
                  "text-xs px-3 py-1 rounded-full border transition-colors",
                  unlocked
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : isRed
                    ? "bg-red-50 text-red-700 border-red-200"
                    : status === "unlocking"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                )}
              >
                {unlocked ? "Unlocked" : status === "error" ? "Wrong PIN" : status === "unlocking" ? "Unlocking..." : "Locked"}
              </div>
            </div>

            <div className="mt-7 flex items-center justify-center">
              <div className="relative w-[320px] max-w-full aspect-square">
                <div
                  className={cx(
                    "absolute inset-0 rounded-[38px] bg-gradient-to-br border shadow-[0_18px_50px_rgba(37,99,235,0.18)] transition-colors",
                    isRed ? "from-red-50 to-white border-red-200" : "from-blue-50 to-white border-blue-100"
                  )}
                />
                <div
                  className={cx(
                    "absolute inset-6 rounded-[30px] border bg-white/70 transition-colors",
                    isRed ? "border-red-200" : "border-blue-100"
                  )}
                />

                {/* lock core */}
                <motion.div
                  initial={false}
                  animate={
                    unlocked
                      ? { y: -6, opacity: 0.0, scale: 0.9 }
                      : status === "unlocking"
                      ? { y: [0, -6, 0], scale: [1, 1.06, 1] }
                      : { y: 0, opacity: 1, scale: 1 }
                  }
                  transition={
                    status === "unlocking"
                      ? { duration: 0.55, ease: "easeInOut" }
                      : { duration: 0.35, ease: "easeOut" }
                  }
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div
                    className={cx(
                      "w-28 h-28 rounded-3xl bg-white border flex items-center justify-center shadow-sm",
                      isRed ? "border-red-200" : "border-blue-100"
                    )}
                  >
                    <Lock size={34} className={cx(isRed ? "text-red-600" : "text-blue-700")} />
                  </div>
                </motion.div>

                {/* unlocked core */}
                <motion.div
                  initial={false}
                  animate={unlocked ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.92, y: 8 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="w-28 h-28 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shadow-sm">
                    <Unlock size={34} className="text-emerald-700" />
                  </div>
                </motion.div>

                {/* bolts */}
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={cx("absolute w-2.5 h-2.5 rounded-full transition-colors", isRed ? "bg-red-200" : "bg-blue-200/80")}
                    style={{
                      left: `${10 + (i % 5) * 20}%`,
                      top: i < 5 ? "9%" : "91%",
                      transform: "translate(-50%,-50%)",
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 text-sm text-gray-600 leading-relaxed">
              Enter the <span className="text-gray-900 font-semibold">4-digit locker PIN</span> to open the vault.
              <br />
              After unlock, you’ll be redirected to <b>/superadmin/manage</b>.
            </div>

            <div
              className={cx(
                "mt-4 flex items-center gap-2 text-xs border rounded-2xl px-3 py-2 transition-colors",
                isRed ? "text-red-700 bg-red-50 border-red-200" : "text-blue-700 bg-blue-50 border-blue-100"
              )}
            >
              <Quote size={14} />
              Keep it private — vault access controls critical settings.
            </div>
          </motion.div>

          {/* right */}
          <motion.div
            animate={panelControls}
            className={cx(
              "rounded-3xl bg-white/80 backdrop-blur border p-6 sm:p-7 shadow-sm transition-colors",
              isRed ? "border-red-200" : "border-blue-100"
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              {!unlocked ? (
                <motion.div
                  key="locked"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex items-center gap-2">
                    <KeyRound className={cx(isRed ? "text-red-600" : "text-blue-700")} size={18} />
                    <h2 className="text-lg font-semibold">Enter PIN</h2>
                  </div>

                  <p className="text-sm text-gray-600 mt-2">This area is restricted. Please enter the 4-digit PIN.</p>

                  <div className="mt-6 flex items-center gap-3 justify-center" onPaste={onPaste}>
                    {digits.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => (inputsRef.current[i] = el)}
                        value={d}
                        onChange={(e) => onChange(i, e)}
                        onKeyDown={(e) => onKeyDown(i, e)}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={1}
                        className={cx(
                          "w-14 h-16 text-center text-2xl font-bold rounded-2xl outline-none border transition shadow-sm",
                          isRed ? "bg-red-50 border-red-200 focus:border-red-400" : "bg-white border-blue-100 focus:border-blue-400"
                        )}
                      />
                    ))}
                  </div>

                  <div className="mt-6 flex items-center gap-3">
                    <button
                      onClick={tryUnlockAndGo}
                      disabled={status === "unlocking"}
                      className={cx(
                        "flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl transition font-semibold text-white",
                        status === "unlocking"
                          ? "bg-blue-300"
                          : isRed
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-blue-600 hover:bg-blue-700"
                      )}
                    >
                      {status === "unlocking" ? "Unlocking..." : "Open Vault"}
                      <ArrowRight size={18} />
                    </button>

                    <button
                      onClick={() => {
                        setDigits(["", "", "", ""]);
                        setStatus("idle");
                        setNavError("");
                        setTimeout(() => focusIndex(0), 0);
                      }}
                      className="px-4 py-3 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 transition"
                    >
                      Clear
                    </button>
                  </div>

                  <motion.div animate={errorControls} className="mt-4">
                    {(status === "error" || navError) && (
                      <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2">
                        <AlertTriangle size={16} className="mt-0.5" />
                        <div>
                          <div className="font-semibold">Oops</div>
                          <div>
                            {navError ||
                              (pinValue !== PIN && isComplete ? "Wrong PIN. Try again." : "Please enter all 4 digits.")}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="unlocked"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-emerald-700" size={18} />
                    <h2 className="text-lg font-semibold">Unlocked</h2>
                  </div>

                  <p className="text-sm text-gray-600 mt-2">If you’re not redirected automatically, click below.</p>

                  <button
                    onClick={() => safeNavigate("/superadmin/manage")}
                    className={cx(
                      "mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl transition font-semibold text-white",
                      "bg-blue-600 hover:bg-blue-700"
                    )}
                  >
                    Go to Manage Users <ArrowRight size={18} />
                  </button>

                  {navError && (
                    <motion.div animate={errorControls} className="mt-4">
                      <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2">
                        <AlertTriangle size={16} className="mt-0.5" />
                        <div>
                          <div className="font-semibold">Navigation Failed</div>
                          <div>{navError}</div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="mt-4 text-sm text-gray-500">Tip: This unlock is stored only for this browser session.</div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
