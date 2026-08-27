import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../LanguageContext";

export default function DeliveryOtpModal({ order, onClose, onConfirm, submitting }) {
  const { t } = useLanguage();
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    inputRefs[0].current?.focus();
  }, []);

  const handleChange = (index, value) => {
    setError("");
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const newDigits = [...digits];
      newDigits[index] = "";
      setDigits(newDigits);
      return;
    }

    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, 4).split("");
      const newDigits = [...digits];
      pasted.forEach((char, i) => {
        if (i < 4) newDigits[i] = char;
      });
      setDigits(newDigits);
      const nextIndex = Math.min(pasted.length, 3);
      inputRefs[nextIndex].current?.focus();
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleaned[0];
    setDigits(newDigits);

    if (index < 3 && cleaned[0]) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const otpCode = digits.join("");
  const isComplete = otpCode.length === 4;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isComplete || submitting) return;
    setError("");
    try {
      await onConfirm(otpCode);
    } catch (err) {
      setError(err.message || "Invalid OTP. Please check with the buyer and try again.");
    }
  };

  return (
    <div className="cancellation-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="cancellation-modal delivery-otp-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-otp-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="otp-modal-header">
          <div className="otp-modal-icon">🔐</div>
          <div>
            <h2 id="delivery-otp-title">{t("Delivery Confirmation OTP")}</h2>
            <p className="otp-modal-sub">
              {t("Order")} #{order?.id} · {order?.productName || "Produce"}
            </p>
          </div>
        </div>

        <p className="otp-instructions">
          {t("Ask the buyer for the 4-digit secret OTP displayed on their order tracking screen to verify and complete delivery.")}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="otp-inputs-wrapper" role="group" aria-label={t("4-digit OTP")}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={inputRefs[index]}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                className={`otp-digit-input ${digit ? "is-filled" : ""}`}
                value={digit}
                onChange={(event) => handleChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                aria-label={`Digit ${index + 1}`}
                disabled={submitting}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {error && <div className="otp-error-banner" role="alert">{t(error)}</div>}

          <div className="cancellation-actions" style={{ marginTop: "24px" }}>
            <button
              className="deliver-btn otp-confirm-btn"
              type="submit"
              disabled={!isComplete || submitting}
            >
              {submitting ? t("Verifying...") : t("Verify & Mark Delivered")}
            </button>
            <button
              className="login-btn"
              type="button"
              onClick={onClose}
              disabled={submitting}
            >
              {t("Cancel")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
