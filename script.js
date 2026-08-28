const API_URL = "https://script.google.com/macros/s/AKfycbytpkVI8Ikoj3LJYrlvxxEgl4mssp1BHi7MPxKfRmDUOC1xWdavdeQs4oE7Gm7927A4/exec";

const SUPPORT_PRICE = 2000;
const MAX_PEOPLE = 5;
const MAX_CHILD_AGE = 18;
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
const childAgeFields = document.getElementById("child-age-fields");
const childAgeList = document.getElementById("child-age-list");
const participantFields = document.getElementById("participant-fields");
const supportNotice = document.getElementById("support-notice");
const supportFields = document.getElementById("support-fields");
const supportUnitsSelect = document.getElementById("support-units");
const supportAmount = document.getElementById("support-amount");
const afterPartyChoiceBlock = document.getElementById("after-party-choice-block");
const afterPartyFields = document.getElementById("after-party-fields");
const afterPartyAdultsSelect = document.getElementById("after-party-adults");
const afterPartyChildrenSelect = document.getElementById("after-party-children");
const paymentMethod = document.getElementById("payment-method");
const attendanceInputs = [...form.elements.attendance];
const paymentInputs = [...form.elements.paymentChoice];
const afterPartyInputs = [...form.elements.afterPartyParticipation];
const participateInput = attendanceInputs.find((input) => input.value === "参加");
const joinAfterPartyInput = afterPartyInputs.find((input) => input.value === "参加");
const skipAfterPartyInput = afterPartyInputs.find((input) => input.value === "不参加");

let isFull = false;
let isSubmitting = false;
let pendingSubmissionData = null;

// 本編・二次会とも、人数の選択肢（0〜5人）を作ります。
for (let count = 1; count <= MAX_PEOPLE; count += 1) {
  adultsSelect.add(new Option(`${count}人`, String(count)));
  childrenSelect.add(new Option(`${count}人`, String(count)));
  afterPartyAdultsSelect.add(new Option(`${count}人`, String(count)));
  afterPartyChildrenSelect.add(new Option(`${count}人`, String(count)));
}

const errorTargets = {
  name: document.getElementById("name-error"),
  email: document.getElementById("email-error"),
  attendance: document.getElementById("attendance-error"),
  people: document.getElementById("people-error"),
  payment: document.getElementById("payment-error"),
  supportUnits: document.getElementById("support-units-error"),
  afterParty: document.getElementById("after-party-error"),
  afterPartyPeople: document.getElementById("after-party-people-error"),
  childAges: document.getElementById("child-age-error")
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

function getAgeSelects(listElement) {
  return [...listElement.querySelectorAll("select")];
}

function getSelectedAges(listElement) {
  return getAgeSelects(listElement)
    .filter((select) => select.value !== "")
    .map((select) => Number(select.value));
}

function renderChildAgeFields({ count, section, list, idPrefix, labelPrefix, errorKey }) {
  const previousValues = getAgeSelects(list).map((select) => select.value);
  clearError(errorKey, getAgeSelects(list));
  list.replaceChildren();

  if (count === 0) {
    section.hidden = true;
    return;
  }

  section.hidden = false;

  for (let index = 0; index < count; index += 1) {
    const field = document.createElement("div");
    const label = document.createElement("label");
    const selectWrap = document.createElement("div");
    const select = document.createElement("select");
    const childNumber = index + 1;
    const selectId = `${idPrefix}-${childNumber}`;

    field.className = "field-group";
    selectWrap.className = "select-wrap";
    label.htmlFor = selectId;
    label.textContent = `${labelPrefix}${childNumber}人目の年齢`;
    select.id = selectId;
    select.name = `${idPrefix}[]`;
    select.setAttribute("aria-describedby", errorTargets[errorKey].id);
    select.add(new Option("年齢を選択してください", ""));

    for (let age = 0; age <= MAX_CHILD_AGE; age += 1) {
      select.add(new Option(`${age}歳`, String(age)));
    }

    if (previousValues[index] !== undefined) {
      select.value = previousValues[index];
    }

    select.addEventListener("change", () => {
      const ageSelects = getAgeSelects(list);
      if (ageSelects.every((item) => item.value !== "")) {
        clearError(errorKey, ageSelects);
      }
    });

    selectWrap.append(select);
    field.append(label, selectWrap);
    list.append(field);
  }
}

function updateMainChildAgeFields() {
  renderChildAgeFields({
    count: Number(childrenSelect.value),
    section: childAgeFields,
    list: childAgeList,
    idPrefix: "child-age",
    labelPrefix: "子ども",
    errorKey: "childAges"
  });
}

function validateChildAges(count, list, errorKey, messagePrefix) {
  const ageSelects = getAgeSelects(list);
  clearError(errorKey, ageSelects);

  if (count === 0) return { isValid: true, firstInvalidElement: null };

  if (ageSelects.length !== count) {
    const firstSelect = ageSelects[0] || list;
    showError(errorKey, `${messagePrefix}の年齢入力欄を確認してください。`, [firstSelect]);
    return { isValid: false, firstInvalidElement: firstSelect };
  }

  for (let index = 0; index < ageSelects.length; index += 1) {
    const select = ageSelects[index];
    const age = Number(select.value);

    if (select.value === "" || !Number.isInteger(age) || age < 0 || age > MAX_CHILD_AGE) {
      showError(errorKey, `${messagePrefix}${index + 1}人目の年齢を選択してください。`, [select]);
      return { isValid: false, firstInvalidElement: select };
    }
  }

  return { isValid: true, firstInvalidElement: null };
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
  const isSupporting = attendance === "PayPay支援";
  const isMainAbsentWithAfterParty = attendance === "本編不参加";

  participantFields.hidden = !isParticipating;
  supportNotice.hidden = !isSupporting;
  supportFields.hidden = !isSupporting;
  adultsSelect.disabled = !isParticipating;
  childrenSelect.disabled = !isParticipating;
  supportUnitsSelect.disabled = !isSupporting;
  paymentInputs.forEach((input) => {
    input.disabled = !isParticipating;
  });

  afterPartyChoiceBlock.hidden = isMainAbsentWithAfterParty;

  if (isMainAbsentWithAfterParty) {
    joinAfterPartyInput.checked = true;
    skipAfterPartyInput.checked = false;
  }

  clearError("people", [adultsSelect, childrenSelect]);
  clearError("payment", paymentInputs.map((input) => input.closest("label")));
  clearError("supportUnits", [supportUnitsSelect]);

  if (isParticipating) {
    updateMainChildAgeFields();
  } else {
    childAgeFields.hidden = true;
    clearError("childAges", getAgeSelects(childAgeList));
  }

  if (isSupporting) {
    paymentMethod.value = PAYMENT_METHODS.PAYPAY;
    updateSupportAmount();
  } else if (isParticipating) {
    paymentMethod.value = getSelectedPaymentMethod();
  } else {
    paymentMethod.value = "";
  }

  updateAfterPartyFields();
}

function updateAfterPartyFields() {
  const isJoiningAfterParty = form.elements.afterPartyParticipation.value === "参加";

  afterPartyFields.hidden = !isJoiningAfterParty;
  afterPartyAdultsSelect.disabled = !isJoiningAfterParty;
  afterPartyChildrenSelect.disabled = !isJoiningAfterParty;
  clearError("afterParty", afterPartyInputs.map((input) => input.closest("label")));
  clearError("afterPartyPeople", [afterPartyAdultsSelect, afterPartyChildrenSelect]);

  if (!isJoiningAfterParty) {
    afterPartyAdultsSelect.value = "0";
    afterPartyChildrenSelect.value = "0";
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
    availabilityText.textContent = "定員に達したため、本編参加の受付は終了しました。\n本編不参加・PayPay支援・二次会のお申し込みは引き続き受け付けています。";
  } else {
    availabilityStatus.classList.add("availability-status--open");
    availabilityText.textContent = "現在、参加申し込みを受け付けています。";
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
      throw new Error(result.message || "受付状況を取得できませんでした。");
    }

    setAvailability(result);
  } catch (error) {
    console.error("受付状況の取得に失敗しました。", error);
    availabilityStatus.className = "availability-status availability-status--error";
    availabilityText.textContent = "受付状況を取得できませんでした。お申し込みの確定時に最新状況を確認します。";
  }
}

function validateForm() {
  let isValid = true;
  let firstInvalidElement = null;
  const attendance = form.elements.attendance.value;
  const isParticipating = attendance === "参加";
  const isSupporting = attendance === "PayPay支援";
  const afterPartyParticipation = form.elements.afterPartyParticipation.value;
  const isJoiningAfterParty = afterPartyParticipation === "参加";
  const selectedPaymentMethod = getSelectedPaymentMethod();
  const supportUnits = Number(supportUnitsSelect.value);
  const adults = Number(adultsSelect.value);
  const children = Number(childrenSelect.value);
  const afterPartyAdults = Number(afterPartyAdultsSelect.value);
  const afterPartyChildren = Number(afterPartyChildrenSelect.value);

  clearError("name", [nameInput]);
  clearError("email", [emailInput]);
  clearError("attendance", attendanceInputs.map((input) => input.closest("label")));
  clearError("people", [adultsSelect, childrenSelect]);
  clearError("payment", paymentInputs.map((input) => input.closest("label")));
  clearError("supportUnits", [supportUnitsSelect]);
  clearError("afterParty", afterPartyInputs.map((input) => input.closest("label")));
  clearError("afterPartyPeople", [afterPartyAdultsSelect, afterPartyChildrenSelect]);
  clearError("childAges", getAgeSelects(childAgeList));

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

  if (
    isParticipating &&
    (!Number.isInteger(adults) || !Number.isInteger(children) || adults < 0 || children < 0 || adults > MAX_PEOPLE || children > MAX_PEOPLE)
  ) {
    showError("people", "参加人数を0〜5人から選択してください。", [adultsSelect, childrenSelect]);
    firstInvalidElement = firstInvalidElement || adultsSelect;
    isValid = false;
  } else if (isParticipating && adults === 0 && children === 0) {
    showError("people", "参加人数を1名以上選択してください。", [adultsSelect, childrenSelect]);
    firstInvalidElement = firstInvalidElement || adultsSelect;
    isValid = false;
  }

  if (isParticipating) {
    const childAgeValidation = validateChildAges(children, childAgeList, "childAges", "子ども");
    if (!childAgeValidation.isValid) {
      firstInvalidElement = firstInvalidElement || childAgeValidation.firstInvalidElement;
      isValid = false;
    }
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

  if (!afterPartyParticipation) {
    showError("afterParty", "二次会への参加・不参加を選択してください。", afterPartyInputs.map((input) => input.closest("label")));
    firstInvalidElement = firstInvalidElement || afterPartyInputs[0];
    isValid = false;
  }

  if (
    isJoiningAfterParty &&
    (!Number.isInteger(afterPartyAdults) || !Number.isInteger(afterPartyChildren) || afterPartyAdults < 0 || afterPartyChildren < 0 || afterPartyAdults > MAX_PEOPLE || afterPartyChildren > MAX_PEOPLE)
  ) {
    showError("afterPartyPeople", "二次会の参加人数を0〜5人から選択してください。", [afterPartyAdultsSelect, afterPartyChildrenSelect]);
    firstInvalidElement = firstInvalidElement || afterPartyAdultsSelect;
    isValid = false;
  } else if (isJoiningAfterParty && afterPartyAdults === 0 && afterPartyChildren === 0) {
    showError("afterPartyPeople", "二次会の参加人数を1名以上選択してください。", [afterPartyAdultsSelect, afterPartyChildrenSelect]);
    firstInvalidElement = firstInvalidElement || afterPartyAdultsSelect;
    isValid = false;
  }

  return { isValid, firstInvalidElement };
}

function buildSubmissionData() {
  const participationType = form.elements.attendance.value;
  const isParticipating = participationType === "参加";
  const isSupporting = participationType === "PayPay支援";
  const afterPartyParticipation = form.elements.afterPartyParticipation.value;
  const isJoiningAfterParty = afterPartyParticipation === "参加";

  return {
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    participationType,
    adults: isParticipating ? Number(adultsSelect.value) : 0,
    children: isParticipating ? Number(childrenSelect.value) : 0,
    childAges: isParticipating ? getSelectedAges(childAgeList) : [],
    paymentMethod: isParticipating
      ? getSelectedPaymentMethod()
      : (isSupporting ? PAYMENT_METHODS.PAYPAY : ""),
    message: messageInput.value.trim(),
    supportUnits: isSupporting ? Number(supportUnitsSelect.value) : 0,
    afterPartyParticipation,
    afterPartyAdults: isJoiningAfterParty ? Number(afterPartyAdultsSelect.value) : 0,
    afterPartyChildren: isJoiningAfterParty ? Number(afterPartyChildrenSelect.value) : 0
  };
}

function formatAgeConfirmation(ages) {
  return ages.map((age, index) => `・${index + 1}人目：${age}歳`).join("\n");
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

  if (data.participationType === "参加") {
    addConfirmationRow("本編", "参加");
    addConfirmationRow("大人人数", `${data.adults}人`);
    addConfirmationRow("子ども人数", `${data.children}人`);
    if (data.childAges.length > 0) {
      addConfirmationRow("子どもの年齢", formatAgeConfirmation(data.childAges));
    }
    addConfirmationRow("合計人数", `${data.adults + data.children}人`);
    const paymentLabel = data.paymentMethod === PAYMENT_METHODS.ON_SITE ? "現地払い" : "PayPay";
    addConfirmationRow("支払い方法", paymentLabel);
  } else if (data.participationType === "本編不参加") {
    addConfirmationRow("本編", "不参加");
  } else {
    addConfirmationRow("参加区分", "PayPay支援");
    addConfirmationRow("支援口数", `${data.supportUnits}口`);
    addConfirmationRow("1口あたり", "2,000円");
    addConfirmationRow("支援金額", formatYen(data.supportUnits * SUPPORT_PRICE));
  }

  if (data.afterPartyParticipation === "参加") {
    addConfirmationRow("二次会", "参加");
    addConfirmationRow("二次会大人人数", `${data.afterPartyAdults}人`);
    addConfirmationRow("二次会子ども人数", `${data.afterPartyChildren}人`);
    addConfirmationRow("二次会合計人数", `${data.afterPartyAdults + data.afterPartyChildren}人`);
    addConfirmationRow("開始", "17:30〜");
    addConfirmationRow("二次会のご案内", "席のみの予約、食事は個別注文になります");
  } else {
    addConfirmationRow("二次会", "不参加");
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
  } else if (data.participationType === "PayPay支援") {
    successTitle.textContent = "ご支援ありがとうございます";
    firstLine.textContent = "ご登録いただいたメールアドレスへPayPayのお支払い案内を送信しました。";
    successBody.append(firstLine);
  } else {
    successTitle.textContent = "お申し込みありがとうございます";
    firstLine.textContent = "ご登録いただいたメールアドレスへ確認メールを送信しました。";
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
    showFormAlert("定員に達しました。本編参加の受付は終了しました。本編不参加・PayPay支援・二次会のお申し込みは引き続き受け付けています。", true);
    return;
  }

  const remaining = Number(result.remaining);
  const requestedPeople = data.adults + data.children;

  if (
    data.participationType === "参加" &&
    Number.isFinite(remaining) &&
    requestedPeople > remaining
  ) {
    returnToForm(adultsSelect);
    showFormAlert("定員を超えるため、この人数では申し込みできません。参加人数を減らしてもう一度お試しください。", true);
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

afterPartyInputs.forEach((input) => {
  input.addEventListener("change", () => {
    hideFormAlert();
    updateAfterPartyFields();
  });
});

[adultsSelect, childrenSelect].forEach((select) => {
  select.addEventListener("change", () => {
    if (select === childrenSelect) {
      updateMainChildAgeFields();
    }
    if (Number(adultsSelect.value) > 0 || Number(childrenSelect.value) > 0) {
      clearError("people", [adultsSelect, childrenSelect]);
    }
  });
});

[afterPartyAdultsSelect, afterPartyChildrenSelect].forEach((select) => {
  select.addEventListener("change", () => {
    if (Number(afterPartyAdultsSelect.value) > 0 || Number(afterPartyChildrenSelect.value) > 0) {
      clearError("afterPartyPeople", [afterPartyAdultsSelect, afterPartyChildrenSelect]);
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
updateAfterPartyFields();
updateSupportAmount();
loadAvailability();
