function nameApp() {
  return {
    nameEntries: [],
    exclusionDialogVisible: false,
    availableExclusions: [],
    currentExclusions: [],
    currentNameEntry: null,
    output: "",
    newName: "",
    decodedAssignments: {},
    selectedName: null,
    linkCopied: false,

    init() {
      document.addEventListener("keydown", this.closeOnEscape.bind(this));
      this.$refs.nameInput.focus();
      const urlParams = new URLSearchParams(window.location.search);
      const encodedAssignments = urlParams.get("assignments");
      if (encodedAssignments) {
        this.decodedAssignments = JSON.parse(atob(encodedAssignments));
      }
    },

    isObjectEmpty(objectName) {
      return Object.keys(objectName).length === 0;
    },

    closeOnEscape(event) {
      if (event.key === "Escape" || event.keyCode === 27) {
        this.exclusionDialogVisible = false;
        this.$refs.nameInput.focus();
      }
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
      const previousExclusions = [...this.currentNameEntry.exclusions];
      this.currentNameEntry.exclusions = [...this.currentExclusions];

      // Ensure new exclusions are symmetrical
      for (let exclusion of this.currentExclusions) {
        const excludedEntry = this.nameEntries.find((entry) => entry.name === exclusion);
        if (excludedEntry && !excludedEntry.exclusions.includes(this.currentNameEntry.name)) {
          excludedEntry.exclusions.push(this.currentNameEntry.name);
        }
      }

      // Ensure removed exclusions are also removed symmetrically
      for (let previousExclusion of previousExclusions) {
        if (!this.currentExclusions.includes(previousExclusion)) {
          const previouslyExcludedEntry = this.nameEntries.find((entry) => entry.name === previousExclusion);
          if (previouslyExcludedEntry) {
            const index = previouslyExcludedEntry.exclusions.indexOf(this.currentNameEntry.name);
            if (index > -1) {
              previouslyExcludedEntry.exclusions.splice(index, 1);
            }
          }
        }
      }

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

      // Ensure symmetrical exclusions are removed
      const excludedEntry = this.nameEntries.find((entry) => entry.name === exclusion);
      if (excludedEntry) {
        const reverseExclusionIndex = excludedEntry.exclusions.indexOf(nameEntry.name);
        if (reverseExclusionIndex > -1) {
          excludedEntry.exclusions.splice(reverseExclusionIndex, 1);
        }
      }
    },

    assign() {
      const names = this.nameEntries.map((entry) => entry.name),
        exclusions = this.nameEntries.reduce((acc, entry) => {
          acc[entry.name] = entry.exclusions;
          return acc;
        }, {}),
        assignmentsOptions = this.getAssignments(names, exclusions),
        assignmentsDict = this.assignmentGPT(names, exclusions);

      console.log(assignmentsDict);

      if (!assignmentsDict) {
        alert("No assignment could be made!");
        return;
      }
      // Encode the assignments to Base64
      const encodedAssignments = btoa(JSON.stringify(assignmentsDict));
      this.output = location.protocol + "//" + location.host + location.pathname + "?assignments=" + encodedAssignments;
    },

    copyToClipboard() {
      navigator.clipboard
        .writeText(this.output)
        .then(() => {
          this.linkCopied = true;
        })
        .catch((err) => {
          console.error("Could not copy text: ", err);
        });
    },

    getAssignments(participantsArray, constraints) {
      let visited = new Set();
      let assignmentCombinations = [];
      let foundCycles = [];
      let stringifiedAssignments = [];

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
            return [...path, start];
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

      function isRotationOfFoundCycle(cycle) {
        if (!cycle) return false;

        let strCycle = cycle.join("");
        for (let found of foundCycles) {
          let doubled = found + found;
          if (doubled.includes(strCycle)) {
            return true;
          }
        }
        return false;
      }

      let participants = {};
      for (let name of participantsArray) {
        participants[name] = participantsArray.filter((p) => p !== name);
      }

      for (let start of participantsArray) {
        visited.clear();
        visited.add(start);
        let cycle = findCycle(start, start, [start]);
        if (cycle && !isRotationOfFoundCycle(cycle)) {
          foundCycles.push(cycle.join(""));
          let assignments = {};
          for (let i = 0; i < cycle.length - 1; i++) {
            assignments[cycle[i]] = cycle[i + 1];
          }
          assignments = Object.entries(assignments).sort((a, b) => (a[0] > b[0] ? 1 : -1));
          const stringifiedAssignment = JSON.stringify(assignments);
          if (!stringifiedAssignments.includes(stringifiedAssignment)) {
            assignmentCombinations.push(assignments);
            stringifiedAssignments.push(stringifiedAssignment);
            if (assignmentCombinations.length === 5) {
              break;
            }
          }
        }
      }

      return assignmentCombinations;
    },

    assignmentGPT(participantsArray, constraints) {
      let visited = new Set();

      // Convert the simple array to the old structure
      let participants = {};
      for (let name of participantsArray) {
        participants[name] = participantsArray.filter((p) => p !== name);
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

    removeAssignmentsFromURL() {
      const url = new URL(window.location);
      url.searchParams.delete("assignments");
      window.location.href = url;
    }
  };
}
