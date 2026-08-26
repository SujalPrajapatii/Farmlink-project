import { useState } from "react";
import { useLanguage } from "../LanguageContext";

const buyerReasons = [
  "I ordered by mistake", "I found a better price elsewhere", "I no longer need the product",
  "Delivery is taking too long", "I ordered the wrong quantity", "I want to change the order",
  "Payment-related issue", "Other reason",
];
const sellerReasons = [
  "Product is out of stock", "Unable to fulfill the requested quantity", "Product quality issue",
  "Product is no longer available", "Unable to deliver the order", "Price or order information issue",
  "Unexpected business/operational issue", "Buyer requested cancellation", "Other reason",
];

export default function CancellationModal({ role, orderId, onClose, onConfirm, submitting }) {
  const { t } = useLanguage();
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const reasons = role === "buyer" ? buyerReasons : sellerReasons;
  const needsCustomReason = reason === "Other reason";
  const canSubmit = Boolean(reason) && (!needsCustomReason || customReason.trim());

  return <div className="cancellation-modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="cancellation-modal" role="dialog" aria-modal="true" aria-labelledby="cancel-order-title" onMouseDown={(event) => event.stopPropagation()}>
      <h2 id="cancel-order-title">{t("Cancel Order")}</h2>
      <p>{t("Cancellation Reason")}</p>
      <div className="cancellation-reasons">
        {reasons.map((option) => <label key={option}>
          <input type="radio" name={`cancel-reason-${orderId}`} value={option} checked={reason === option} onChange={(event) => setReason(event.target.value)} />
          {t(option)}
        </label>)}
      </div>
      {needsCustomReason && <textarea value={customReason} onChange={(event) => setCustomReason(event.target.value)} placeholder={t("Tell us why you are cancelling this order") } required />}
      <p className="cancellation-confirmation">{t("Are you sure you want to cancel this order?")}</p>
      <div className="cancellation-actions">
        <button className="cancel-btn" type="button" disabled={!canSubmit || submitting} onClick={() => onConfirm({ reason, customReason: customReason.trim() })}>{submitting ? t("Cancelling...") : t("Cancel Order")}</button>
        <button className="login-btn" type="button" onClick={onClose} disabled={submitting}>{t("Keep Order")}</button>
      </div>
    </section>
  </div>;
}
