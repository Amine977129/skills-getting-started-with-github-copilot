document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const activityCards = new Map();

  function updateActivityCounts(activityCard, details) {
    const participantCount = activityCard.querySelector(".participants-list").children.length;
    activityCard.querySelector(".participants-count").textContent = participantCount;
    activityCard.querySelector(".availability-count").textContent =
      details.max_participants - participantCount;
  }

  function addParticipantToCard(name, email, details, activityCard) {
    const participantsList = activityCard.querySelector(".participants-list");
    const participant = document.createElement("li");
    participant.className = "participant-item";
    participant.dataset.email = email;

    const participantEmail = document.createElement("span");
    participantEmail.className = "participant-email";
    participantEmail.textContent = email;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-participant";
    removeButton.setAttribute("aria-label", `Unregister ${email} from ${name}`);
    removeButton.title = "Unregister participant";
    removeButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 10v6m4-6v6" />
      </svg>
    `;
    removeButton.addEventListener("click", async () => {
      removeButton.disabled = true;

      try {
        const response = await fetch(
          `/activities/${encodeURIComponent(name)}/signup?email=${encodeURIComponent(email)}`,
          { method: "DELETE" }
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.detail || "Could not unregister participant");
        }

        participantsList.querySelectorAll(".participant-item").forEach((item) => {
          if (item.dataset.email === email) {
            item.remove();
          }
        });
        updateActivityCounts(activityCard, details);
      } catch (error) {
        removeButton.disabled = false;
        messageDiv.textContent = error.message;
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
      }
    });

    participant.append(participantEmail, removeButton);
    participantsList.appendChild(participant);
    updateActivityCounts(activityCard, details);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> <span class="availability-count">${spotsLeft}</span> spots left</p>
          <div class="participants-section">
            <h5>Participants (<span class="participants-count">${details.participants.length}</span>)</h5>
            <ul class="participants-list"></ul>
          </div>
        `;

        details.participants.forEach((email) => {
          addParticipantToCard(name, email, details, activityCard);
        });

        activitiesList.appendChild(activityCard);
        activityCards.set(name, { activityCard, details });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        const activityView = activityCards.get(activity);
        if (activityView) {
          addParticipantToCard(activity, email, activityView.details, activityView.activityCard);
        }
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
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

  // Initialize app
  fetchActivities();
});
