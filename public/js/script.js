let minecraft_username_input = document.getElementById("minecraft_username");
let email_address_input = document.getElementById("email");
let verify_input = document.getElementById("verify_input");
let send_verification_code_btn = document.getElementById(
  "send_verification_code"
);
let verity_btn = document.getElementById("verity_btn");
let message_area = document.getElementById("message_area");
let verify_section = document.getElementById("verify_section");
let  verify_message = document.getElementById("verify-message");

const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get("username");

if (username) {
  minecraft_username_input.value = username;
}

window.onload = function() {
  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get('success');
  const message = urlParams.get('message');

  if (success && success === 'true') {
    let alert = document.createElement("div");
    alert.classList.add("alert");
    alert.classList.add("alert-success");
    alert.textContent = "You have been successfully verified";

    verify_message.appendChild(alert);
  } else if(success) {
    let alert = document.createElement("div");
    alert.classList.add("alert");
    alert.classList.add("alert-danger");
    alert.textContent = message;

    verify_message.appendChild(alert);
  }
};


// When the user clicks the login button
document.getElementById("discord-login-button").addEventListener("click", function(event) {
  event.preventDefault();

  const minecraftUsername = minecraft_username_input.value;
  const loginUrl = `/discord/login?username=${encodeURIComponent(minecraftUsername)}`;
  
  // Redirect to the login URL with Minecraft username
  window.location.href = loginUrl;
});
