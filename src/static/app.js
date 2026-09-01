document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  const PARTICIPANTS_DISPLAY_LIMIT = 10;

  async function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Fetch and update a single activity card (optimized re-render)
  async function updateActivityCard(activityName) {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      const activity = activities[activityName];

      if (!activity) return;

      const card = document.querySelector(`[data-activity-name="${activityName}"]`);
      if (!card) return;

      // Update only the changed card, not entire page
      const spotsLeft = activity.max_participants - activity.participants.length;
      const displayParticipants = activity.participants.slice(0, PARTICIPANTS_DISPLAY_LIMIT);
      const hasMore = activity.participants.length > PARTICIPANTS_DISPLAY_LIMIT;

      const participantsList = displayParticipants.length
        ? displayParticipants
            .map(
              (participant) => `
                <li class="participant-row">
                  <span class="participant-email">${participant}</span>
                  <button
                    type="button"
                    class="delete-participant"
                    data-activity="${activityName}"
                    data-email="${participant}"
                    aria-label="Remove ${participant} from ${activityName}"
                  >
                    <span aria-hidden="true">✕</span>
                    <span class="sr-only">Remove ${participant}</span>
                  </button>
                </li>
              `
            )
            .join("")
        : "<li class=\"participant-empty\">No participants yet</li>";

      const moreHTML = hasMore
        ? `<li class="participant-more"><button type="button" class="view-all-btn" data-activity="${activityName}">+${activity.participants.length - PARTICIPANTS_DISPLAY_LIMIT} more participants</button></li>`
        : "";

      // Update badge
      card.querySelector(".availability-badge").textContent = `${spotsLeft} spots left`;

      // Update participant list
      const participantCount = card.querySelector(".participants-box strong");
      participantCount.textContent = `Participants (${activity.participants.length}/${activity.max_participants}):`;

      const participantsList = card.querySelector(".participants-list");
      participantsList.innerHTML = participantsList + moreHTML;
    } catch (error) {
      console.error("Error updating activity card:", error);
    }
  }

  // Function to fetch all activities
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        activityCard.dataset.activityName = name;

        const spotsLeft = details.max_participants - details.participants.length;
        const displayParticipants = details.participants.slice(0, PARTICIPANTS_DISPLAY_LIMIT);
        const hasMore = details.participants.length > PARTICIPANTS_DISPLAY_LIMIT;

        const participantsList = displayParticipants.length
          ? displayParticipants
              .map(
                (participant) => `
                  <li class="participant-row">
                    <span class="participant-email">${participant}</span>
                    <button
                      type="button"
                      class="delete-participant"
                      data-activity="${name}"
                      data-email="${participant}"
                      aria-label="Remove ${participant} from ${name}"
                    >
                      <span aria-hidden="true">✕</span>
                      <span class="sr-only">Remove ${participant}</span>
                    </button>
                  </li>
                `
              )
              .join("")
          : "<li class=\"participant-empty\">No participants yet</li>";

        const moreHTML = hasMore
          ? `<li class="participant-more"><button type="button" class="view-all-btn" data-activity="${name}">+${details.participants.length - PARTICIPANTS_DISPLAY_LIMIT} more participants</button></li>`
          : "";

        activityCard.innerHTML = `
          <div class="activity-header">
            <h4>${name}</h4>
            <span class="availability-badge">${spotsLeft} spots left</span>
          </div>
          <p class="activity-description">${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <div class="participants-box">
            <strong>Participants (${details.participants.length}/${details.max_participants}):</strong>
            <ul class="participants-list">
              ${participantsList}
              ${moreHTML}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

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

  // EVENT DELEGATION: Single listener instead of 200+ individual listeners
  // This dramatically reduces memory usage and improves performance
  activitiesList.addEventListener("click", async (event) => {
    // Handle delete-participant button
    const deleteBtn = event.target.closest(".delete-participant");
    if (deleteBtn) {
      const activity = deleteBtn.dataset.activity;
      const email = deleteBtn.dataset.email;

      try {
        const response = await fetch(
          `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
          { method: "DELETE" }
        );

        const result = await response.json();

        if (response.ok) {
          await updateActivityCard(activity);
          showMessage(result.message, "success");
        } else {
          showMessage(result.detail || "Unable to unregister participant.", "error");
        }
      } catch (error) {
        console.error("Error unregistering participant:", error);
        showMessage("Failed to unregister participant.", "error");
      }
    }

    // Handle view-all button for expanding participant list
    const viewAllBtn = event.target.closest(".view-all-btn");
    if (viewAllBtn) {
      const activity = viewAllBtn.dataset.activity;
      const card = viewAllBtn.closest(".activity-card");

      try {
        const response = await fetch("/activities");
        const activities = await response.json();
        const activityData = activities[activity];

        if (activityData) {
          // Render all participants
          const allParticipants = activityData.participants
            .map(
              (participant) => `
                <li class="participant-row">
                  <span class="participant-email">${participant}</span>
                  <button
                    type="button"
                    class="delete-participant"
                    data-activity="${activity}"
                    data-email="${participant}"
                    aria-label="Remove ${participant} from ${activity}"
                  >
                    <span aria-hidden="true">✕</span>
                    <span class="sr-only">Remove ${participant}</span>
                  </button>
                </li>
              `
            )
            .join("");

          const participantsList = card.querySelector(".participants-list");
          participantsList.innerHTML = allParticipants;

          // Remove the view-all button since all are now shown
          const moreItem = card.querySelector(".participant-more");
          if (moreItem) {
            moreItem.remove();
          }
        }
      } catch (error) {
        console.error("Error loading all participants:", error);
        showMessage("Failed to load all participants.", "error");
      }
    }
  });

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
        signupForm.reset();
        await updateActivityCard(activity);
        showMessage(result.message, "success");
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
