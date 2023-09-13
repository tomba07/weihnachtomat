function nameApp() {
  return {
    nameEntries: [],
    exclusionDialogVisible: false,
    availableExclusions: [],
    currentExclusions: [],
    currentNameEntry: null,
    output: "",
    newName: "",
    decodedAssignments: null,
    selectedName: null,

    init() {
      document.addEventListener("keydown", this.closeOnEscape.bind(this));
      this.$refs.nameInput.focus();
      const urlParams = new URLSearchParams(window.location.search);
      const encodedAssignments = urlParams.get("assignments");
      if (encodedAssignments) {
        this.decodedAssignments = JSON.parse(atob(encodedAssignments));
      }
    },

    closeOnEscape(event) {
      if (event.key === "Escape" || event.keyCode === 27) {
        this.exclusionDialogVisible = false;
        this.$refs.nameInput.focus();
      }
    },

    selectAllExclusions() {
      this.currentExclusions = [...this.availableExclusions];
    },

    addNewName() {
      if (this.newName && this.newName.length > 0 && !this.nameEntries.some((entry) => entry.name === this.newName)) {
        this.nameEntries.push({ name: this.newName.trim(), exclusions: [] });
        this.newName = "";
      } else {
        alert("Please enter a unique name.");
      }
    },

    showExclusionDialog(nameEntry) {
      this.currentNameEntry = nameEntry;
      this.currentExclusions = [...nameEntry.exclusions];
      this.availableExclusions = this.nameEntries.map((entry) => entry.name).filter((name) => name !== nameEntry.name && Boolean(name));
      this.exclusionDialogVisible = true;
    },

    saveExclusions() {
      this.currentNameEntry.exclusions = [...this.currentExclusions];
      this.exclusionDialogVisible = false;
      this.$refs.nameInput.focus();
    },

    removeName(nameEntry) {
      const index = this.nameEntries.indexOf(nameEntry);

      if (index > -1) {
        this.nameEntries.splice(index, 1);
      }
      this.availableExclusions = this.nameEntries.map((entry) => entry.name).filter(Boolean);
    },

    removeExclusion(nameEntry, exclusion) {
      const index = nameEntry.exclusions.indexOf(exclusion);

      if (index > -1) {
        nameEntry.exclusions.splice(index, 1);
      }
    },

    assign() {
      const names = this.nameEntries.map((entry) => entry.name),
        exclusions = this.nameEntries.reduce((acc, entry) => {
          acc[entry.name] = entry.exclusions;
          return acc;
        }, {}),
        assignmentsDict = this.assignmentGPT(names, exclusions);
      console.log(assignmentsDict);

      // Encode the assignments to Base64
      const encodedAssignments = btoa(JSON.stringify(assignmentsDict));
      navigator.clipboard
        .writeText(window.location.href.split("?")[0] + "?assignments=" + encodedAssignments)
        .then(() => {
          alert("Resolution link copied to clipboard!");
          this.$refs.nameInput.focus();
        })
        .catch((err) => {
          console.error("Could not copy text: ", err);
        });
    },

    assignmentGPT(participantsArray, constraints) {
      let visited = new Set();

      // Convert the simple array to the old structure
      let participants = {};
      for (let name of participantsArray) {
        participants[name] = participantsArray.filter(p => p !== name);
      }

      function isValid(current, nextParticipant) {
        if (visited.has(nextParticipant)) {
          return false;
        }
        if (constraints[current] && constraints[current].includes(nextParticipant)) {
          return false;
        }
        return true;
      }

      function findCycle(current, start, path) {
        if (path.length === Object.keys(participants).length) {
          if (participants[current].includes(start)) {
            path.push(start);
            return path;
          }
          return null;
        }

        for (let nextParticipant of participants[current]) {
          if (isValid(current, nextParticipant)) {
            visited.add(nextParticipant);
            let newPath = findCycle(nextParticipant, start, [...path, nextParticipant]);
            if (newPath) {
              return newPath;
            }
            visited.delete(nextParticipant);
          }
        }
        return null;
      }

      let keys = Object.keys(participants);
      let start = keys[Math.floor(Math.random() * keys.length)];
      visited.add(start);
      let cycle = findCycle(start, start, [start]);
      if (cycle) {
        let assignments = {};
        for (let i = 0; i < cycle.length - 1; i++) {
          assignments[cycle[i]] = cycle[i + 1];
        }
        return assignments;
      } else {
        return null;
      }
    },

    copyResolutionLink() {
      navigator.clipboard
        .writeText(this.encodedLink)
        .then(() => {
          alert("Resolution link copied to clipboard!");
        })
        .catch((err) => {
          console.error("Could not copy text: ", err);
        });
    }
  };
}
