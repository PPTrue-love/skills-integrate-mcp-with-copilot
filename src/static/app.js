document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const signupContainer = document.getElementById("signup-container");
  const messageDiv = document.getElementById("message");
  const teacherAccountButton = document.getElementById("teacher-account-button");
  const teacherLoginDialog = document.getElementById("teacher-login-dialog");
  const teacherLoginForm = document.getElementById("teacher-login-form");
  const teacherLoginMessage = document.getElementById("teacher-login-message");
  let teacherAuthenticated = false;

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      if (!response.ok) {
        throw new Error("Unable to load activities");
      }
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.replaceChildren(new Option("-- Select an activity --", ""));

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) => `<li>
                      <span class="participant-email">${email}</span>
                      ${teacherAuthenticated
                        ? `<button class="delete-btn" data-activity="${name}" data-email="${email}" aria-label="Unregister ${email}">Remove</button>`
                        : ""}
                    </li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target.closest(".delete-btn");
    if (!button || !teacherAuthenticated) {
      return;
    }
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        await fetchActivities();
      } else {
        if (response.status === 401) {
          teacherAuthenticated = false;
          updateTeacherControls();
          await fetchActivities();
        }
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!teacherAuthenticated) {
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        await fetchActivities();
      } else {
        if (response.status === 401) {
          teacherAuthenticated = false;
          updateTeacherControls();
          await fetchActivities();
        }
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  function updateTeacherControls() {
    signupContainer.classList.toggle("hidden", !teacherAuthenticated);
    teacherAccountButton.textContent = teacherAuthenticated ? "Teacher sign out" : "Teacher sign in";
  }

  async function refreshTeacherSession() {
    const response = await fetch("/admin/session");
    if (!response.ok) {
      throw new Error("Unable to check teacher session");
    }
    const session = await response.json();
    teacherAuthenticated = session.authenticated === true;
    updateTeacherControls();
  }

  teacherAccountButton.addEventListener("click", async () => {
    if (!teacherAuthenticated) {
      teacherLoginMessage.textContent = "";
      teacherLoginMessage.classList.add("hidden");
      teacherLoginDialog.showModal();
      return;
    }

    try {
      await fetch("/admin/logout", { method: "POST" });
      teacherAuthenticated = false;
      updateTeacherControls();
      await fetchActivities();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  });

  document.getElementById("teacher-login-cancel").addEventListener("click", () => {
    teacherLoginDialog.close();
  });

  teacherLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(teacherLoginForm);
    try {
      const response = await fetch("/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.get("username"),
          password: formData.get("password"),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        teacherLoginMessage.textContent = result.detail || "Unable to sign in";
        teacherLoginMessage.classList.remove("hidden");
        return;
      }

      teacherLoginForm.reset();
      teacherLoginDialog.close();
      teacherAuthenticated = true;
      updateTeacherControls();
      await fetchActivities();
    } catch (error) {
      teacherLoginMessage.textContent = "Unable to sign in. Please try again.";
      teacherLoginMessage.classList.remove("hidden");
      console.error("Error signing in:", error);
    }
  });

  async function initializeApp() {
    try {
      await refreshTeacherSession();
    } catch (error) {
      teacherAuthenticated = false;
      updateTeacherControls();
      console.error("Error checking teacher session:", error);
    }
    await fetchActivities();
  }

  updateTeacherControls();
  initializeApp();
});
