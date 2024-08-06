// document
//   .getElementById("loginForm").addEventListener("submit", function (event) {
//     event.preventDefault();

//     const username = document.getElementById("username").value;
//     const password = document.getElementById("password").value;

//     fetch("users.json")
//       .then((response) => response.json())
//       .then((users) => {
//         const user = users.find(
//           (user) => user.username === username && user.password === password
//         );
//         const messageDiv = document.getElementById("message");

//         if (user) {
//           messageDiv.textContent = "Login bem-sucedido!";
//           messageDiv.style.color = "green";
//         } else {
//           messageDiv.textContent = "Usuário ou senha incorretos.";
//           messageDiv.style.color = "red";
//         }
//       })
//       .catch((error) => {
//         console.error("Erro ao carregar o arquivo JSON:", error);
//       });
//   });

document
  .getElementById("loginForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    console.log(username, password);
    fetch(users.json)
      .then((response) => response.json())
      .then((users) => {
        const user = users.find(
          (user) => user.username === username && user.password === password
        );
        const messageDiv = document.getElementById("message");

        if (user) {
          messageDiv.textContent = "Login bem-sucedido!";
          messageDiv.style.color = "green";
        } else {
          messageDiv.textContent = "Usuário ou senha incorretos.";
          messageDiv.style.color = "red";
        }
      })
      .catch((error) => {
        console.error("Erro ao carregar o arquivo JSON:", error);
      });
  });
