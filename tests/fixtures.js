// Shared mock HTML fixtures for tests, modeled on real forms.

// Azure AD B2C "self-asserted" security question page: the question text
// lives in a <p> inside a sibling <li>, not inside the answer field's own
// container. Only 2 of the 3 possible questions are rendered per visit,
// which is exactly the "random 2 of 3" scenario SmartFill needs to handle.
const AZURE_B2C_STYLE = `<!DOCTYPE html>
<html><body>
<form id="attributeVerification">
  <div id="attributeList" class="attr">
    <ul>
      <li class="Readonly signInNameReadOnly_li"><div class="attrEntry"><label for="signInNameReadOnly">User name*</label><input id="signInNameReadOnly" type="text" value="applezhang01" disabled readonly></div></li>
      <li class="Paragraph kbq1ReadOnly_li"><div class="attrEntry"><label for="kbq1ReadOnly">Security question 1*</label><p id="kbq1ReadOnly" aria-label="What was your first car?">What was your first car?</p></div></li>
      <li class="Password kba1_response_li"><div class="attrEntry"><label for="kba1_response"></label><input id="kba1_response" type="password" autocomplete="new-password" aria-required="true"></div></li>
      <li class="Paragraph kbq3ReadOnly_li"><div class="attrEntry"><label for="kbq3ReadOnly">Security question 2*</label><p id="kbq3ReadOnly" aria-label="In what city or town was your first job?">In what city or town was your first job?</p></div></li>
      <li class="Password kba3_response_li"><div class="attrEntry"><label for="kba3_response"></label><input id="kba3_response" type="password" autocomplete="new-password" aria-required="true"></div></li>
    </ul>
  </div>
  <button id="continue" type="submit">Continue</button>
</form>
</body></html>`;

// Standard label[for] layout, the most common case.
const STANDARD_LABEL_STYLE = `<!DOCTYPE html>
<html><body>
<form>
  <label for="q_pet">What is the name of your first pet?</label>
  <input id="q_pet" type="text">
  <label for="q_city">What city were you born in?</label>
  <input id="q_city" type="text">
</form>
</body></html>`;

// A field that already has a value typed in - must never be overwritten.
const PREFILLED_STYLE = `<!DOCTYPE html>
<html><body>
<form>
  <label for="q_pet">What is the name of your first pet?</label>
  <input id="q_pet" type="text" value="AlreadyTyped">
</form>
</body></html>`;

// Question text is injected asynchronously (simulates an SPA that renders
// the question after a fetch/animation), to exercise the MutationObserver.
const DYNAMIC_STYLE = `<!DOCTYPE html>
<html><body>
<div id="root"></div>
<script>
  setTimeout(() => {
    document.getElementById('root').innerHTML =
      '<label for="q_maiden">What is your mother\\'s maiden name?</label>' +
      '<input id="q_maiden" type="text">';
  }, 400);
</script>
</body></html>`;

module.exports = {
  AZURE_B2C_STYLE,
  STANDARD_LABEL_STYLE,
  PREFILLED_STYLE,
  DYNAMIC_STYLE,
};
