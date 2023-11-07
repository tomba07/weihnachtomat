function nameApp() {
  return {
    nameEntries: [],
    exclusionDialogVisible: false,
    availableExclusions: [],
    currentExclusions: [],
    currentNameEntry: null,
    assignmentLink: "",
    newName: "",
    decodedAssignments: {},
    selectedName: null,
    showLinkCopiedMessage: false,
    error: "",
    warning: "",
    showExclusions: false,
    showMaxGifts: false,

    init() {
      this.loadSettings();
      this.loadNameEntries();
      document.addEventListener("keydown", this.closeOnEscape.bind(this));
      this.$refs.nameInput.focus();
      const urlParams = new URLSearchParams(window.location.search);
      const encodedAssignments = urlParams.get("assignments");
      if (encodedAssignments) {
        this.decodedAssignments = JSON.parse(atob(encodedAssignments));
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

    saveNameEntries() {
      localStorage.setItem("nameEntries", JSON.stringify(this.nameEntries));
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

    loadNameEntries() {
      try {
        const savedEntries = localStorage.getItem("nameEntries");

        if (savedEntries) {
          this.nameEntries = JSON.parse(savedEntries);
          this.verifyConfig();
        }
      } catch (e) {
        console.warn("Loading Name Entries Failed. Removing name entries from localStorage.");
        localStorage.removeItem("nameEntries");
      }
    },

    updateNameEntries() {
      this.saveNameEntries();
      this.verifyConfig();
      //Remove assignment link since no longer valid
      this.assignmentLink = "";
    },

    closeOnEscape(event) {
      if (event.key === "Escape" || event.keyCode === 27) {
        this.exclusionDialogVisible = false;
        this.$refs.nameInput.focus();
      }
    },

    addNewName() {
      const name = this.newName.trim();

      if (!name || name.length === 0) {
        alert("Please enter a valid name.");
      } else if (this.nameEntries.some((entry) => entry.name === name)) {
        alert("Please enter a unique name.");
      } else {
        this.nameEntries.push({ name: name, exclusions: [], numberOfGifts: 1 });
        this.newName = "";
      }

      this.$nextTick(() => {
        const namesList = document.getElementById("names-list");
        namesList.scrollTop = namesList.scrollHeight;
        this.$refs.nameInput.focus();
      });

      this.updateNameEntries();
    },

    showExclusionDialog(nameEntry) {
      this.currentNameEntry = nameEntry;
      this.currentExclusions = [...nameEntry.exclusions];
      this.availableExclusions = this.nameEntries.map((entry) => entry.name).filter((name) => name !== nameEntry.name && Boolean(name));
      this.exclusionDialogVisible = true;
    },

    saveExclusions() {
      this.currentNameEntry.exclusions = [...this.currentExclusions];
      this.updateNameEntries();
      this.exclusionDialogVisible = false;
    },

    removeName(nameEntry) {
      this.nameEntries.splice(this.nameEntries.indexOf(nameEntry), 1);
      this.nameEntries.forEach((entry) => {
        this.removeExclusion(entry, nameEntry.name);
      });
      this.updateNameEntries();
    },

    removeExclusion(nameEntry, exclusion) {
      const index = nameEntry.exclusions.indexOf(exclusion);

      if (index > -1) {
        nameEntry.exclusions.splice(index, 1);
      }
      this.updateNameEntries();
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
          console.error("Could not copy text: ", err);
        });
    },

    getNameEntriesClone() {
      return this.nameEntries.map((entry) => {
        return {
          name: entry.name,
          numberOfGifts: entry.numberOfGifts,
          exclusions: entry.exclusions
        };
      });
    },

    getGivers(nameInfo) {
      //Return an array of givers. If someone gives x gifts, he will be duplicated x times
      return nameInfo.reduce((prev, curr) => {
        for (let i = 0; i < curr.numberOfGifts; i++) {
          prev.push(curr.name)
        }

        return prev;
      }, [])
    },

    secretSanta() {
      const numberOfParticipants = this.nameEntries.length,
        //For some reason, cloning with Alpine JS does not work properly, so using this workaround
        clonedNames = this.getNameEntriesClone(),
        shuffledNames = shuffleArray(clonedNames),
        exclusionsByName = this.nameEntries.reduce((prev, curr) => {
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

      const givers = this.getGivers(shuffledNames),
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

    removeAssignmentsFromURL() {
      const url = new URL(window.location);
      url.searchParams.delete("assignments");
      window.location.href = url;
    },

    verifyConfig() {
      if (this.nameEntries.length < 3) {
        return;
      }
      const names = this.nameEntries.map((entry) => entry.name),
        giftsOffered = this.nameEntries.reduce((sum, entry) => sum + entry.numberOfGifts, 0),
        numberOfParticipants = this.nameEntries.length;

      this.warning = "";
      this.error = "";

      if (giftsOffered < numberOfParticipants) {
        const giftCountDifference = Math.abs(giftsOffered - numberOfParticipants);

        this.error = `Error: The total number of gifts (${giftsOffered}) is less than the number of participants (${numberOfParticipants}). Difference: ${giftCountDifference}.`;
      } else {
        const testResult = this.secretSanta() || {};
        let recipientCount = 0;

        for (let key in testResult) {
          // Add the array length to the counter
          recipientCount += testResult[key].length;
        }

        if (recipientCount < numberOfParticipants) {
          this.error = "Error: Not everyone will receive a gift with the current configuration. Please check the exclusions.";
        } else {
          // Check for exclusions that only leave one option
          this.nameEntries.forEach((entry) => {
            if (entry.numberOfGifts > 0 && entry.exclusions.length === names.length - 2) {
              this.warning = "Warning: Some participants have only one possible match. This can lead to predictable results.";
            }
          });
        }
      }
    }
  };
}
