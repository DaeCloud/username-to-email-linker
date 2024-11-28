let minecraft_username_input = document.getElementById("minecraft_username");
let email_address_input = document.getElementById("email");
let verify_input = document.getElementById("verify_input");
let send_verification_code_btn = document.getElementById(
  "send_verification_code"
);
let verity_btn = document.getElementById("verity_btn");
let message_area = document.getElementById("message_area");
let verify_section = document.getElementById("verify_section");

const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get("username");

if (username) {
  minecraft_username_input.value = username;
}

send_verification_code_btn.addEventListener("click", (event) => {
  event.preventDefault();

  let username = minecraft_username_input.value;
  let email = email_address_input.value;

  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    username,
    email,
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  fetch("/register", requestOptions)
    .then((response) => response.json())
    .then((result) => {
      let alert = document.createElement("div");
      alert.classList.add("alert");
      alert.setAttribute("role", "alert");
      alert.textContent = result.message;

      if (result.success) {
        alert.classList.add("alert-primary");
        verify_section.style.display = "block";
      } else {
        alert.classList.add("alert-danger");
      }

      document.getElementById("send-message").innerHTML = "";
      document.getElementById("send-message").appendChild(alert);
    })
    .catch((error) => {});
});

verity_btn.addEventListener("click", (event) => {
  event.preventDefault();

  let username = minecraft_username_input.value;
  let verificationCode = verify_input.value;

  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  const raw = JSON.stringify({
    username,
    verificationCode,
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  fetch("/verify", requestOptions)
    .then((response) => response.json())
    .then((result) => {
      let alert = document.createElement("div");
      alert.classList.add("alert");
      alert.setAttribute("role", "alert");
      alert.textContent = result.message;

      if (result.success) {
        alert.classList.add("alert-success");
        verify_section.style.display = "block";
      } else {
        alert.classList.add("alert-danger");
      }

      document.getElementById("verify-message").innerHTML = "";
      document.getElementById("verify-message").appendChild(alert);
    })
    .catch((error) => {});
});
