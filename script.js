function nameApp() {
  return {
    //General
    participants: [],
    nameInputValue: "",
    errorMessage: "",
    warningMessage: "",
    assignmentLink: "",
    showLinkCopiedMessage: false,
    //Exclusion Dialog
    exclusionDialogVisible: false,
    dialogExclusionOptions: [],
    dialogSelectedExclusions: [],
    exclusionContext: null,
    //Settings
    showExclusions: false,
    showMaxGifts: false,
    //Resolution
    decodedAssignments: {},
    resolutionSelectedName: null,

    init() {
      const urlParams = new URLSearchParams(window.location.search);
      const encodedAssignments = urlParams.get("assignments");

      if (encodedAssignments) {
        this.decodedAssignments = JSON.parse(atob(encodedAssignments));
      }
      this.loadSettings();
      this.loadParticipants();
      document.addEventListener("keydown", this.closeDialogOnEscape.bind(this));
      this.$refs.nameInput.focus();
    },

    loadSettings() {
      try {
        const savedSettings = localStorage.getItem("appSettings");

        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          this.showExclusions = settings.showExclusions;
          this.showMaxGifts = settings.showMaxGifts;
        }
      } catch (e) {
        console.warn("Loading Settings Failed. Removing settings from localStorage.");
        localStorage.removeItem("appSettings");
      }
    },

    loadParticipants() {
      try {
        const savedEntries = localStorage.getItem("participants");

        if (savedEntries) {
          this.participants = JSON.parse(savedEntries);
          this.verifyConfig();
        }
      } catch (e) {
        console.warn("Loading Name Entries Failed. Removing name entries from localStorage.");
        localStorage.removeItem("participants");
      }
    },

    saveSettings() {
      localStorage.setItem(
        "appSettings",
        JSON.stringify({
          showExclusions: this.showExclusions,
          showMaxGifts: this.showMaxGifts
        })
      );
    },

    saveParticipants() {
      localStorage.setItem("participants", JSON.stringify(this.participants));
    },

    updateParticipants() {
      this.saveParticipants();
      this.verifyConfig();
      //Remove assignment link since no longer valid
      this.assignmentLink = "";
    },

    closeDialogOnEscape(event) {
      if (event.key === "Escape" || event.keyCode === 27) {
        this.exclusionDialogVisible = false;
        this.$refs.nameInput.focus();
      }
    },

    addNewName() {
      const name = this.nameInputValue.trim();

      if (!name || name.length === 0) {
        alert("Please enter a valid name.");
      } else if (this.participants.some((entry) => entry.name === name)) {
        alert("Please enter a unique name.");
      } else {
        this.participants.push({ name: name, exclusions: [], numberOfGifts: 1 });
        this.nameInputValue = "";
      }

      this.$nextTick(() => {
        const namesList = document.getElementById("names-list");
        namesList.scrollTop = namesList.scrollHeight;
        this.$refs.nameInput.focus();
      });

      this.updateParticipants();
    },

    removeName(nameEntry) {
      this.participants.splice(this.participants.indexOf(nameEntry), 1);
      this.participants.forEach((entry) => {
        this.removeExclusion(entry, nameEntry.name);
      });
      this.updateParticipants();
    },

    showExclusionDialog(nameEntry) {
      this.exclusionContext = nameEntry;
      this.dialogSelectedExclusions = [...nameEntry.exclusions];
      this.dialogExclusionOptions = this.participants.map((entry) => entry.name).filter((name) => name !== nameEntry.name && Boolean(name));
      this.exclusionDialogVisible = true;
    },

    saveExclusions() {
      this.exclusionContext.exclusions = [...this.dialogSelectedExclusions];
      this.updateParticipants();
      this.exclusionDialogVisible = false;
    },

    removeExclusion(nameEntry, exclusion) {
      const index = nameEntry.exclusions.indexOf(exclusion);

      if (index > -1) {
        nameEntry.exclusions.splice(index, 1);
      }
      this.updateParticipants();
    },

    assign() {
      const assignmentsDict = this.secretSanta();

      console.log(assignmentsDict);

      if (!assignmentsDict) {
        alert("No assignment could be made!");
      } else {
        const encodedAssignments = btoa(JSON.stringify(assignmentsDict));
        this.assignmentLink = location.protocol + "//" + location.host + location.pathname + "?assignments=" + encodedAssignments;
      }
    },

    secretSanta() {
      const numberOfParticipants = this.participants.length,
        //For some reason, cloning with Alpine JS does not work properly, so using this workaround
        clonedNames = getParticipantsClone(this.participants),
        shuffledNames = shuffleArray(clonedNames),
        exclusionsByName = this.participants.reduce((prev, curr) => {
          prev[curr.name] = curr.exclusions;
          return prev;
        }, {});

      let offeredGifts = shuffledNames.reduce((sum, entry) => sum + entry.numberOfGifts, 0);

      // Reduce the numberOfGifts in a fair manner until totalGifts equals numberOfParticipants
      while (offeredGifts > numberOfParticipants) {
        const maxGiftsEntry = shuffledNames.reduce((prev, current) => (prev.numberOfGifts > current.numberOfGifts ? prev : current));

        maxGiftsEntry.numberOfGifts--;
        offeredGifts--;
      }

      const givers = getGivers(shuffledNames),
        receivers = shuffledNames.map(entry => entry.name),
        graph = new SecretSantaMatcher(givers, receivers);

      // Build the graph edges based on exclusions
      givers.forEach((giver, giverIndex) => {
        receivers.forEach((receiver, receiverIndex) => {
          if (giver !== receiver && !exclusionsByName[giver].includes(receiver)) {
            graph.addSecretSantaPairing(giverIndex, numberOfParticipants + receiverIndex);
          }
        });
      });

      return graph.generateSecretSantaPairs();
    },

    verifyConfig() {
      if (this.participants.length < 3) {
        return;
      }
      const names = this.participants.map((entry) => entry.name),
        giftsOffered = this.participants.reduce((sum, entry) => sum + entry.numberOfGifts, 0),
        numberOfParticipants = this.participants.length;

      this.warningMessage = "";
      this.errorMessage = "";

      if (giftsOffered < numberOfParticipants) {
        const giftCountDifference = Math.abs(giftsOffered - numberOfParticipants);

        this.errorMessage = `Error: The total number of gifts (${giftsOffered}) is less than the number of participants (${numberOfParticipants}). Difference: ${giftCountDifference}.`;
      } else {
        const testResult = this.secretSanta() || {};
        let recipientCount = 0;

        for (let key in testResult) {
          // Add the array length to the counter
          recipientCount += testResult[key].length;
        }

        if (recipientCount < numberOfParticipants) {
          this.errorMessage = "Error: Not everyone will receive a gift with the current configuration. Please check the exclusions.";
        } else {
          // Check for exclusions that only leave one option
          this.participants.forEach((entry) => {
            if (entry.numberOfGifts > 0 && entry.exclusions.length === names.length - 2) {
              this.warningMessage = "Warning: Some participants have only one possible match. This can lead to predictable results.";
            }
          });
        }
      }
    },

    copyToClipboard() {
      navigator.clipboard
        .writeText(this.assignmentLink)
        .then(() => {
          this.showLinkCopiedMessage = true;
          setTimeout(() => {
            this.showLinkCopiedMessage = false;
          }, 500);
        })
        .catch((err) => {
          console.errorMessage("Could not copy text: ", err);
        });
    }
  };
}
