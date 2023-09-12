function nameApp() {
  return {
    nameEntries: [],
    exclusionModalVisible: false,
    availableExclusions: [],
    currentExclusions: [],
    currentNameEntry: null,
    output: "",
    newName: "",

    init() {
      document.addEventListener("keydown", this.closeOnEscape.bind(this));
      this.$refs.nameInput.focus();
    },

    closeOnEscape(event) {
      if (event.key === "Escape" || event.keyCode === 27) {
        this.exclusionModalVisible = false;
      }
    },

    selectAllExclusions() {
      this.currentExclusions = [...this.availableExclusions];
    },

    addNewName() {
      if (this.newName && !this.nameEntries.some((entry) => entry.name === this.newName)) {
        this.nameEntries.push({ id: Date.now(), name: this.newName, exclusions: [] });
        this.newName = "";
      } else {
        alert("Please enter a unique name.");
      }
    },

    showExclusionModal(nameEntry) {
      this.currentNameEntry = nameEntry;
      this.currentExclusions = [...nameEntry.exclusions];
      this.availableExclusions = this.nameEntries.map((entry) => entry.name).filter((name) => name !== nameEntry.name && Boolean(name));
      this.exclusionModalVisible = true;
    },

    saveExclusions() {
      this.currentNameEntry.exclusions = [...this.currentExclusions];
      this.exclusionModalVisible = false;
    },

    removeNameInput(nameEntry) {
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
        assignments = this.createAssignments(names, exclusions);

      this.output = assignments.join("<br>");
    },

    createAssignments(names, exclusions) {
      const shuffledNames = names.sort(() => Math.random() - 0.5);
      const assignmentsDict = this.assignGifts(shuffledNames, exclusions);

      return this.formatAssignments(assignmentsDict);
    },

    assignGifts(names, exclusions) {
      const assignmentsDict = names.reduce((acc, curr) => {
        acc[curr] = [];
        return acc;
      }, {});

      names.forEach((recipientName) => {
        //ignore exclusions and self
        let potentialGifters = names.filter((gifterName) => gifterName !== recipientName && (!exclusions[gifterName] || !exclusions[gifterName].includes(recipientName)));
        const lowestAssignmentCount = Math.min(...potentialGifters.map((gifterName) => assignmentsDict[gifterName].length));

        //because of exclusions, sometimes people have to gift more than one person. It should however be evenly distributed.
        potentialGifters = potentialGifters.filter((gifterName) => assignmentsDict[gifterName].length === lowestAssignmentCount);

        let gifter = potentialGifters[Math.floor(Math.random() * potentialGifters.length)];

        if (!gifter) {
          const noGifter = "No one";

          if (!assignmentsDict[noGifter]) {
            assignmentsDict[noGifter] = [];
          }

          gifter = noGifter;
        }
        assignmentsDict[gifter].push(recipientName);
      });

      return assignmentsDict;
    },

    formatAssignments(assignmentsDict) {
      let assignmentsList = [];
      for (let gifter in assignmentsDict) {
        assignmentsList.push(gifter + " -> " + assignmentsDict[gifter].join(", "));
      }
      return assignmentsList;
    }
  };
}
