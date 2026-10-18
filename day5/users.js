
const loadButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusMessage = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

const API_URL = "https://jsonplaceholder.typicode.com/users";

// Store the users fetched from the API.
let users = [];

// Display any array of users in the list.
function renderUsers(list) {
  usersList.replaceChildren();

  if (list.length === 0) {
    usersList.textContent = "No users match your filter.";
    return;
  }

  list.forEach(function (user) {
    const listItem = document.createElement("li");

    const name = document.createElement("h3");
    name.textContent = user.name;

    const email = document.createElement("p");
    email.textContent = `Email: ${user.email}`;

    const city = document.createElement("p");
    city.textContent = `City: ${user.address.city}`;

    const company = document.createElement("p");
    company.textContent = `Company: ${user.company.name}`;

    listItem.append(name, email, city, company);
    usersList.appendChild(listItem);
  });
}

// Fetch users from the API.
async function loadUsers() {
  loadButton.disabled = true;
  statusMessage.textContent = "Loading users...";
  usersList.replaceChildren();

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    users = await response.json();

    statusMessage.textContent = `Successfully loaded ${users.length} users.`;

    // Apply the current filter after loading.
    filterUsers();
  } catch (error) {
    users = [];
    usersList.replaceChildren();
    statusMessage.textContent =
      "Unable to load users. Please check your connection and try again.";

    console.error("Error loading users:", error);
  } finally {
    loadButton.disabled = false;
  }
}

// Filter stored users without making another API request.
function filterUsers() {
  const searchTerm = filterInput.value.trim().toLowerCase();

  const filteredUsers = users.filter(function (user) {
    return user.name.toLowerCase().includes(searchTerm);
  });

  renderUsers(filteredUsers);
}

// Load users when the button is clicked.
loadButton.addEventListener("click", loadUsers);

// Filter users as the input changes.
filterInput.addEventListener("input", function () {
  filterUsers();
});
