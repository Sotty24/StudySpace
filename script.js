const today = new Date();

document.querySelector("#current-date").textContent =
    today.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long"
    });

const assignmentForm = document.querySelector("#assignment-form");
const assignmentSection = document.querySelector("#assignments");
const storageNote = assignmentSection.querySelector(".storage-note");
const storageKey = "studyspace-assignments-v2";

const searchInput = document.querySelector("#assignment-search");
const statusFilter = document.querySelector("#status-filter");
const subjectFilter = document.querySelector("#subject-filter");

function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function startOfToday() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
}

function daysUntil(value) {
    const dueDate = new Date(value + "T00:00:00");
    return Math.round((dueDate - startOfToday()) / (1000 * 60 * 60 * 24));
}

function dueText(assignment) {
    if (assignment.status === "Completed") return "Completed";

    const days = daysUntil(assignment.dueDate);

    if (days < 0) {
        const overdueDays = Math.abs(days);
        return `${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue`;
    }
    if (days === 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    return `Due in ${days} days`;
}

function addText(parent, tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    parent.append(element);
    return element;
}

function createAssignmentCard(assignment) {
    const card = document.createElement("article");
    card.className = "assignment-card";
    card.dataset.id = assignment.id;
    card.dataset.dueDate = assignment.dueDate;

    if (assignment.status === "Completed") {
        card.classList.add("is-complete");
    }

    const details = document.createElement("div");
    addText(details, "p", "assignment-module", assignment.module);
    addText(details, "h3", "", assignment.title);

    const dueLine = document.createElement("p");
    dueLine.className = "assignment-due";

    const dueLabel = document.createElement("strong");
    dueLabel.textContent = dueText(assignment);

    const deadline = document.createElement("span");
    const date = new Date(assignment.dueDate + "T00:00:00");
    deadline.textContent =
        "Deadline · " +
        date.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short"
        });

    dueLine.append(dueLabel, deadline);
    details.append(dueLine);

    const side = document.createElement("div");
    side.className = "assignment-card-side";
    addText(side, "span", "assignment-status", assignment.status);
    addText(side, "span", "assignment-priority", assignment.priority + " priority");

    const actions = document.createElement("div");
    actions.className = "assignment-actions";

    const statusButton = document.createElement("button");
    statusButton.className = "assignment-action";
    statusButton.type = "button";
    statusButton.dataset.action = "status";
    statusButton.textContent = assignment.status === "Completed" ? "↻" : "✓";
    statusButton.setAttribute(
        "aria-label",
        assignment.status === "Completed"
            ? "Reset assignment status"
            : "Mark assignment complete"
    );
    statusButton.title =
    assignment.status === "Completed"
        ? "Reopen assignment"
        : "Update assignment status";

    const deleteButton = document.createElement("button");
    deleteButton.className = "assignment-action delete";
    deleteButton.type = "button";
    deleteButton.dataset.action = "delete";
    deleteButton.textContent = "×";
    deleteButton.setAttribute("aria-label", "Delete assignment");
    deleteButton.title = "Delete assignment";

    actions.append(statusButton, deleteButton);
    side.append(actions);
    card.append(details, side);

    return card;
}

function saveAssignments() {
    localStorage.setItem(storageKey, JSON.stringify(assignments));
}

function updateCounts() {
    const activeAssignments = assignments.filter(
        assignment => assignment.status !== "Completed"
    );

    document.querySelector("#due-count").textContent =
        activeAssignments.filter(days => {
            const remaining = daysUntil(days.dueDate);
            return remaining >= 0 && remaining <= 7;
        }).length;

    document.querySelector("#overdue-count").textContent =
        activeAssignments.filter(assignment => daysUntil(assignment.dueDate) < 0).length;

    document.querySelector("#completed-count").textContent =
        assignments.filter(assignment => assignment.status === "Completed").length;

    document.querySelector(".assignment-count").textContent = assignments.length;
}

function renderAssignments() {
    assignments.sort((first, second) => {
        const firstCompleted = first.status === "Completed";
        const secondCompleted = second.status === "Completed";

        if (firstCompleted !== secondCompleted) {
            return firstCompleted ? 1 : -1;
        }

        return first.dueDate.localeCompare(second.dueDate);
    });

    const selectedSubject = subjectFilter.value;
    const subjects = [...new Set(assignments.map(item => item.module))]
        .sort((first, second) => first.localeCompare(second));

    subjectFilter.replaceChildren(new Option("All subjects", "all"));

    subjects.forEach(subject => {
        subjectFilter.add(new Option(subject, subject));
    });

    subjectFilter.value = subjects.includes(selectedSubject)
        ? selectedSubject
        : "all";

    const query = searchInput.value.trim().toLowerCase();

    const visibleAssignments = assignments.filter(assignment => {
        const matchesSearch =
            assignment.title.toLowerCase().includes(query) ||
            assignment.module.toLowerCase().includes(query);

        const matchesStatus =
            statusFilter.value === "all" ||
            assignment.status === statusFilter.value;

        const matchesSubject =
            subjectFilter.value === "all" ||
            assignment.module === subjectFilter.value;

        return matchesSearch && matchesStatus && matchesSubject;
    });

    assignmentSection
        .querySelectorAll(".assignment-card, .assignment-empty")
        .forEach(element => element.remove());

    if (visibleAssignments.length === 0) {
        const message = document.createElement("p");
        message.className = "assignment-empty";
        message.textContent = "No matching assignments. Try changing your search or filters.";
        assignmentSection.insertBefore(message, storageNote);
    } else {
        visibleAssignments.forEach(assignment => {
            assignmentSection.insertBefore(
                createAssignmentCard(assignment),
                storageNote
            );
        });
    }

    updateCounts();
}

let assignments = [];
const savedData = localStorage.getItem(storageKey);

if (savedData) {
    assignments = JSON.parse(savedData);
} else {
    const originalCards = [...assignmentSection.querySelectorAll(".assignment-card")];

    assignments = originalCards.map((card, index) => ({
        id: "starter-" + index,
        title: card.querySelector("h3").textContent.trim(),
        module: card.querySelector(".assignment-module").textContent.trim(),
        dueDate: card.dataset.dueDate,
        priority: card.querySelector(".assignment-priority").textContent
            .replace(" priority", "").trim(),
        status: card.querySelector(".assignment-status").textContent.trim()
    }));

    const olderSavedAssignments =
        JSON.parse(localStorage.getItem("studyspace-assignments")) || [];

    olderSavedAssignments.forEach(assignment => {
        assignments.push({
            ...assignment,
            id: assignment.id || makeId()
        });
    });

    saveAssignments();
}

renderAssignments();

assignmentForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const formData = new FormData(assignmentForm);

    const assignment = {
        id: makeId(),
        title: formData.get("title").trim(),
        module: formData.get("module").trim(),
        dueDate: formData.get("due-date"),
        priority: formData.get("priority"),
        status: formData.get("status")
    };

    assignmentForm.reset();
    assignments.push(assignment);
    saveAssignments();
    renderAssignments();
});

assignmentSection.addEventListener("click", function (event) {
    const button = event.target.closest(".assignment-action");
    if (!button) return;

    const card = button.closest(".assignment-card");
    const assignment = assignments.find(item => item.id === card.dataset.id);
    if (!assignment) return;

    if (button.dataset.action === "delete") {
        assignments = assignments.filter(item => item.id !== assignment.id);
    }

    if (button.dataset.action === "status") {
        if (assignment.status !== "Completed") {
            assignment.previousStatus = assignment.status;
            assignment.status = "Completed";
        } else {
            assignment.status = assignment.previousStatus || "Not started";
            delete assignment.previousStatus;
        }
    }

    saveAssignments();
    renderAssignments();
});
searchInput.addEventListener("input", renderAssignments);
statusFilter.addEventListener("change", renderAssignments);
subjectFilter.addEventListener("change", renderAssignments);