const API_URL = "https://script.google.com/macros/s/AKfycbytpkVI8Ikoj3LJYrlvxxEgl4mssp1BHi7MPxKfRmDUOC1xWdavdeQs4oE7Gm7927A4/exec";

const SUPPORT_PRICE = 2000;
const PAYMENT_METHODS = Object.freeze({
  PAYPAY: "PayPay",
  ON_SITE: "現地支払い"
});
const form = document.getElementById("entry-form");
const confirmationScreen = document.getElementById("confirmation-screen");
const confirmationDetails = document.getElementById("confirmation-details");
const editButton = document.getElementById("edit-button");
const confirmButton = document.getElementById("confirm-button");
const successMessage = document.getElementById("success-message");
const successTitle = document.getElementById("success-title");
const successBody = document.getElementById("success-body");
const emailWarning = document.getElementById("email-warning");
const availabilityStatus = document.getElementById("availability-status");
const availabilityText = document.getElementById("availability-text");
const formAlert = document.getElementById("form-alert");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const messageInput = document.getElementById("message");
const adultsSelect = document.getElementById("adults");
const childrenSelect = document.getElementById("children");
const participantFields = document.getElementById("participant-fields");
const supportNotice = document.getElementById("support-notice");
const supportFields = document.getElementById("support-fields");
const supportUnitsSelect = document.getElementById("support-units");
const supportAmount = document.getElementById("support-amount");
const paymentMethod = document.getElementById("payment-method");
const attendanceInputs = [...form.elements.attendance];
const paymentInputs = [...form.elements.paymentChoice];
const participateInput = attendanceInputs.find((input) => input.value === "参加");

let isFull = false;
let isSubmitting = false;
let pendingSubmissionData = null;

// 人数の選択肢（0〜25人）を作ります。
for (let count = 1; count <= 25; count += 1) {
  adultsSelect.add(new Option(`${count}人`, String(count)));
  childrenSelect.add(new Option(`${count}人`, String(count)));
}

const errorTargets = {
  name: document.getElementById("name-error"),
  email: document.getElementById("email-error"),
  attendance: document.getElementById("attendance-error"),
  people: document.getElementById("people-error"),
  payment: document.getElementById("payment-error"),
  supportUnits: document.getElementById("support-units-error")
};

function showError(key, message, elements) {
  errorTargets[key].textContent = message;
  elements.forEach((element) => {
    element.classList.add("is-invalid");
    element.setAttribute("aria-invalid", "true");
  });
}

function clearError(key, elements) {
  errorTargets[key].textContent = "";
  elements.forEach((element) => {
    element.classList.remove("is-invalid");
    element.removeAttribute("aria-invalid");
  });
}

function hideFormAlert() {
  formAlert.hidden = true;
  formAlert.textContent = "";
}

function showFormAlert(message, shouldFocus = false) {
  formAlert.textContent = message;
  formAlert.hidden = false;
  if (shouldFocus) {
    formAlert.focus();
    formAlert.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function formatYen(amount) {
  return `${amount.toLocaleString("ja-JP")}円`;
}

function updateSupportAmount() {
  const units = Number(supportUnitsSelect.value);
  supportAmount.innerHTML = `ご支援金額：<strong>${formatYen(units * SUPPORT_PRICE)}</strong>`;
}

function getSelectedPaymentMethod() {
  const selectedValue = form.elements.paymentChoice.value;
  return Object.values(PAYMENT_METHODS).includes(selectedValue) ? selectedValue : "";
}

function updateAttendanceFields() {
  const attendance = form.elements.attendance.value;
  const isParticipating = attendance === "参加";
  const isSupporting = attendance === "支援";

  participantFields.hidden = !isParticipating;
  supportNotice.hidden = !isSupporting;
  supportFields.hidden = !isSupporting;
  adultsSelect.disabled = !isParticipating;
  childrenSelect.disabled = !isParticipating;
  supportUnitsSelect.disabled = !isSupporting;
  paymentInputs.forEach((input) => {
    input.disabled = !isParticipating;
  });

  clearError("people", [adultsSelect, childrenSelect]);
  clearError("payment", paymentInputs.map((input) => input.closest("label")));
  clearError("supportUnits", [supportUnitsSelect]);

  if (isSupporting) {
    paymentMethod.value = PAYMENT_METHODS.PAYPAY;
    updateSupportAmount();
  } else if (isParticipating) {
    paymentMethod.value = getSelectedPaymentMethod();
  } else {
    paymentMethod.value = "";
  }
}

function setAvailability(result) {
  const remaining = Number(result.remaining);
  const hasRemaining = Number.isFinite(remaining);
  const full = result.full === true || (hasRemaining && remaining <= 0);

  isFull = full;
  availabilityStatus.className = "availability-status";

  if (full) {
    availabilityStatus.classList.add("availability-status--full");
    availabilityText.textContent = "定員に達したため、参加申し込みの受付は終了しました。\nPayPayでのご支援は引き続き受け付けています。";
  } else {
    availabilityStatus.classList.add("availability-status--open");
    availabilityText.textContent = hasRemaining
      ? `現在の残席：${Math.max(remaining, 0)}名`
      : "現在、参加申し込みを受け付けています。";
  }

  participateInput.disabled = full;
  participateInput.closest("label").classList.toggle("choice-card--disabled", full);
  participateInput.closest("label").setAttribute("aria-disabled", String(full));

  if (full && participateInput.checked) {
    participateInput.checked = false;
    updateAttendanceFields();
  }
}

async function loadAvailability() {
  try {
    const response = await fetch(API_URL, {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    if (result.success !== true) {
      throw new Error(result.message || "残席情報を取得できませんでした。");
    }

    setAvailability(result);
  } catch (error) {
    console.error("残席情報の取得に失敗しました。", error);
    availabilityStatus.className = "availability-status availability-status--error";
    availabilityText.textContent = "残席情報を取得できませんでした。お申し込みの確定時に最新状況を確認します。";
  }
}

function validateForm() {
  let isValid = true;
  let firstInvalidElement = null;
  const attendance = form.elements.attendance.value;
  const isParticipating = attendance === "参加";
  const isSupporting = attendance === "支援";
  const selectedPaymentMethod = getSelectedPaymentMethod();
  const supportUnits = Number(supportUnitsSelect.value);

  clearError("name", [nameInput]);
  clearError("email", [emailInput]);
  clearError("attendance", attendanceInputs.map((input) => input.closest("label")));
  clearError("people", [adultsSelect, childrenSelect]);
  clearError("payment", paymentInputs.map((input) => input.closest("label")));
  clearError("supportUnits", [supportUnitsSelect]);

  if (nameInput.value.trim() === "") {
    showError("name", "お名前を入力してください。", [nameInput]);
    firstInvalidElement = firstInvalidElement || nameInput;
    isValid = false;
  }

  if (emailInput.value.trim() === "") {
    showError("email", "メールアドレスを入力してください。", [emailInput]);
    firstInvalidElement = firstInvalidElement || emailInput;
    isValid = false;
  } else if (!emailInput.validity.valid) {
    showError("email", "メールアドレスを正しい形式で入力してください。（例：nasufes@example.com）", [emailInput]);
    firstInvalidElement = firstInvalidElement || emailInput;
    isValid = false;
  }

  if (!attendance) {
    showError("attendance", "参加の可否を選択してください。", attendanceInputs.map((input) => input.closest("label")));
    firstInvalidElement = firstInvalidElement || attendanceInputs[0];
    isValid = false;
  } else if (isParticipating && isFull) {
    showError("attendance", "定員に達したため、参加申し込みの受付は終了しました。", attendanceInputs.map((input) => input.closest("label")));
    firstInvalidElement = firstInvalidElement || attendanceInputs[0];
    isValid = false;
  }

  if (isParticipating && Number(adultsSelect.value) === 0 && Number(childrenSelect.value) === 0) {
    showError("people", "参加人数を1名以上選択してください。", [adultsSelect, childrenSelect]);
    firstInvalidElement = firstInvalidElement || adultsSelect;
    isValid = false;
  }

  if (isParticipating && !selectedPaymentMethod) {
    showError("payment", "支払い方法を選択してください。", paymentInputs.map((input) => input.closest("label")));
    firstInvalidElement = firstInvalidElement || paymentInputs[0];
    isValid = false;
  }

  if (isSupporting && (!Number.isInteger(supportUnits) || supportUnits < 1 || supportUnits > 5)) {
    showError("supportUnits", "支援口数を1〜5口から選択してください。", [supportUnitsSelect]);
    firstInvalidElement = firstInvalidElement || supportUnitsSelect;
    isValid = false;
  }

  return { isValid, firstInvalidElement };
}

function buildSubmissionData() {
  const isParticipating = form.elements.attendance.value === "参加";

  return {
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    participationType: isParticipating ? "参加" : "PayPay支援",
    adults: isParticipating ? Number(adultsSelect.value) : 0,
    children: isParticipating ? Number(childrenSelect.value) : 0,
    paymentMethod: isParticipating ? getSelectedPaymentMethod() : PAYMENT_METHODS.PAYPAY,
    message: messageInput.value.trim(),
    supportUnits: isParticipating ? 0 : Number(supportUnitsSelect.value)
  };
}

function addConfirmationRow(label, value) {
  const row = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;
  description.textContent = value || "なし";
  row.append(term, description);
  confirmationDetails.append(row);
}

function showConfirmation(data) {
  clearError("payment", paymentInputs.map((input) => input.closest("label")));
  confirmationDetails.replaceChildren();
  addConfirmationRow("お名前", data.name);
  addConfirmationRow("メールアドレス", data.email);
  addConfirmationRow("参加区分", data.participationType);

  if (data.participationType === "参加") {
    addConfirmationRow("大人人数", `${data.adults}人`);
    addConfirmationRow("子ども人数", `${data.children}人`);
    addConfirmationRow("合計人数", `${data.adults + data.children}人`);
    const paymentLabel = data.paymentMethod === PAYMENT_METHODS.ON_SITE ? "現地払い" : "PayPay";
    addConfirmationRow("支払い方法", paymentLabel);
  } else {
    addConfirmationRow("支援口数", `${data.supportUnits}口`);
    addConfirmationRow("1口あたり", "2,000円");
    addConfirmationRow("支援金額", formatYen(data.supportUnits * SUPPORT_PRICE));
  }

  addConfirmationRow("質問・メッセージ", data.message);
  form.hidden = true;
  successMessage.hidden = true;
  confirmationScreen.hidden = false;
  confirmationScreen.focus();
  confirmationScreen.scrollIntoView({ behavior: "smooth", block: "start" });
}

function returnToForm(focusElement = null) {
  confirmationScreen.hidden = true;
  successMessage.hidden = true;
  form.hidden = false;
  if (focusElement) focusElement.focus();
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getResultMessage(result) {
  return String(result.message || result.error || "");
}

function isDuplicateResult(result) {
  return result.duplicate === true || getResultMessage(result).includes("すでにお申し込みいただいています");
}

function isFullResult(result) {
  return result.full === true || getResultMessage(result).includes("定員に達した");
}

function showSuccess(result, data) {
  hideFormAlert();
  form.hidden = true;
  confirmationScreen.hidden = true;
  successMessage.hidden = false;
  successBody.replaceChildren();

  const firstLine = document.createElement("p");

  if (data.participationType === "参加") {
    successTitle.textContent = "お申し込みありがとうございます";
    firstLine.textContent = "ご登録いただいたメールアドレスへ確認メールを送信しました。";
    const eventLine = document.createElement("p");
    eventLine.textContent = "ナスフェスは2026年11月7日（土）に開催します。";
    successBody.append(firstLine, eventLine);
  } else {
    successTitle.textContent = "ご支援ありがとうございます";
    firstLine.textContent = "ご登録いただいたメールアドレスへPayPayのお支払い案内を送信しました。";
    successBody.append(firstLine);
  }

  emailWarning.hidden = result.emailWarning !== true;

  if (Number.isFinite(Number(result.remaining))) {
    setAvailability(result);
  }

  successMessage.focus();
  successMessage.scrollIntoView({ behavior: "smooth", block: "center" });
}

function handleRejectedResult(result, data) {
  const message = getResultMessage(result);

  if (isDuplicateResult(result)) {
    const duplicateMessage = "このメールアドレスでは、すでにお申し込みいただいています。";
    returnToForm(emailInput);
    showError("email", duplicateMessage, [emailInput]);
    showFormAlert(duplicateMessage, true);
    return;
  }

  if (data.participationType === "参加" && isFullResult(result)) {
    setAvailability({ ...result, full: true, remaining: 0 });
    returnToForm();
    showFormAlert("定員に達しました。参加申し込みの受付は終了しました。PayPayでのご支援は引き続き受け付けています。", true);
    return;
  }

  if (data.participationType === "参加" && message.includes("残席")) {
    returnToForm(adultsSelect);
    showFormAlert(message, true);
    return;
  }

  showFormAlert(message || "申し込みを受け付けることができませんでした。内容をご確認のうえ、もう一度お試しください。", true);
}

function setSubmitting(submitting) {
  isSubmitting = submitting;
  confirmButton.disabled = submitting;
  confirmButton.textContent = submitting ? "送信中…" : "この内容で申し込む";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  hideFormAlert();

  const result = validateForm();
  if (!result.isValid) {
    result.firstInvalidElement.focus();
    result.firstInvalidElement.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  pendingSubmissionData = buildSubmissionData();
  showConfirmation(pendingSubmissionData);
});

editButton.addEventListener("click", () => {
  hideFormAlert();
  returnToForm();
});

confirmButton.addEventListener("click", async () => {
  if (isSubmitting || !pendingSubmissionData) return;

  hideFormAlert();
  setSubmitting(true);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(pendingSubmissionData)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    if (isDuplicateResult(result) || (pendingSubmissionData.participationType === "参加" && isFullResult(result))) {
      handleRejectedResult(result, pendingSubmissionData);
    } else if (result.success === true) {
      showSuccess(result, pendingSubmissionData);
    } else {
      handleRejectedResult(result, pendingSubmissionData);
    }
  } catch (error) {
    console.error("申し込みの送信に失敗しました。", error);
    showFormAlert("通信に失敗しました。通信環境をご確認のうえ、もう一度お試しください。", true);
  } finally {
    setSubmitting(false);
  }
});

nameInput.addEventListener("input", () => {
  if (nameInput.value.trim()) clearError("name", [nameInput]);
});

emailInput.addEventListener("input", () => {
  if (emailInput.value.trim() && emailInput.validity.valid) {
    clearError("email", [emailInput]);
  }
});

attendanceInputs.forEach((input) => {
  input.addEventListener("change", () => {
    clearError("attendance", attendanceInputs.map((item) => item.closest("label")));
    hideFormAlert();
    updateAttendanceFields();
  });
});

[adultsSelect, childrenSelect].forEach((select) => {
  select.addEventListener("change", () => {
    if (Number(adultsSelect.value) > 0 || Number(childrenSelect.value) > 0) {
      clearError("people", [adultsSelect, childrenSelect]);
    }
  });
});

paymentInputs.forEach((input) => {
  input.addEventListener("change", () => {
    paymentMethod.value = getSelectedPaymentMethod();
    clearError("payment", paymentInputs.map((item) => item.closest("label")));
    hideFormAlert();
  });
});

supportUnitsSelect.addEventListener("change", () => {
  clearError("supportUnits", [supportUnitsSelect]);
  updateSupportAmount();
});

updateAttendanceFields();
updateSupportAmount();
loadAvailability();
