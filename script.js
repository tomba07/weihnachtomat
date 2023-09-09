function nameApp() {
  return {
    nameEntries: [{ id: Date.now(), name: "", exclusions: [] }],
    exclusionModalVisible: false,
    availableExclusions: [],
    currentExclusions: [],
    currentNameEntry: null,
    output: "",

    updateExclusionOptions() {
      this.availableExclusions = this.nameEntries.map((entry) => entry.name).filter(Boolean);
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

    addNameInput() {
      this.nameEntries.push({ id: Date.now(), name: "", exclusions: [] });
    },

    removeNameInput(nameEntry) {
      const index = this.nameEntries.indexOf(nameEntry);
      if (index > -1) {
        this.nameEntries.splice(index, 1);
      }
      this.updateExclusionOptions();
    },

    removeExclusion(nameEntry, exclusion) {
      const index = nameEntry.exclusions.indexOf(exclusion);
      if (index > -1) {
        nameEntry.exclusions.splice(index, 1);
      }
    },

    assign() {
      let names = this.nameEntries.map((entry) => entry.name).filter(Boolean);
      let exclusions = {};
      this.nameEntries.forEach((entry) => {
        exclusions[entry.name] = entry.exclusions;
      });

      let assignments = this.createAssignments(names, exclusions);
      this.output = assignments.join("<br>");
    },

    createAssignments(names, exclusions) {
      let shuffledNames = [...names].sort(() => Math.random() - 0.5);

      let assignmentsDict = {}; // Dictionary to hold assignments
      let recipients = new Set(); // To keep track of who has been assigned a gift

      for (let i = 0; i < shuffledNames.length; i++) {
        let currentName = shuffledNames[i];
        let nextIndex = (i + 1) % shuffledNames.length;
        let matchedName = shuffledNames[nextIndex];
        let attempts = 0; // Counter to track attempts to find a match

        while (currentName === matchedName || (exclusions[currentName] && exclusions[currentName].includes(matchedName))) {
          nextIndex = (nextIndex + 1) % shuffledNames.length;
          matchedName = shuffledNames[nextIndex];
          attempts++;

          if (attempts >= names.length) {
            matchedName = "No one"; // Assigning "No one" as the match
            break; // Exit the loop
          }
        }

        if (matchedName !== "No one") {
          recipients.add(matchedName);
        }

        if (!assignmentsDict[currentName]) {
          assignmentsDict[currentName] = [];
        }
        assignmentsDict[currentName].push(matchedName);
      }

      // Identify the left-out people
      let leftOutPeople = shuffledNames.filter((name) => !recipients.has(name));

      // Shuffle the potential gifters
      let potentialGifters = shuffledNames.filter((name) => name !== "No one");
      potentialGifters.sort(() => Math.random() - 0.5);

      // Assign the left-out people to the shuffled gifters
      leftOutPeople.forEach((person) => {
        let triedGifters = new Set();
        let gifterIndex = Math.floor(Math.random() * potentialGifters.length);
        let gifter = potentialGifters[gifterIndex];

        // Ensure a person isn't matched with themselves and respect exclusions
        while (gifter === person || (exclusions[gifter] && exclusions[gifter].includes(person)) || triedGifters.has(gifter)) {
          triedGifters.add(gifter);

          if (triedGifters.size >= potentialGifters.length) {
            // We've tried all potential gifters for this person and none are valid
            gifter = "No one";
            break;
          }

          gifterIndex = (gifterIndex + 1) % potentialGifters.length;
          gifter = potentialGifters[gifterIndex];
        }

        if (!assignmentsDict[gifter]) {
          assignmentsDict[gifter] = [];
        }
        assignmentsDict[gifter].push(person);
      });

      // Convert the dictionary to a list format for display
      let assignmentsList = [];
      for (let gifter in assignmentsDict) {
        assignmentsList.push(gifter + " -> " + assignmentsDict[gifter].join(", "));
      }

      return assignmentsList;
    }
  };
}
