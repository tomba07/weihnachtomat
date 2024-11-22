function secretSantaApp() {
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
      const groupNameFromURL = urlParams.get("groupName");

      if (encodedAssignments) {
        this.decodedAssignments = JSON.parse(atob(encodedAssignments));
      }

      // Load group name from URL
      this.groupName = groupNameFromURL || "";
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
          this.groupName = settings.groupName || "";
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
          showMaxGifts: this.showMaxGifts,
          groupName: this.groupName
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
      const assignment = secretSanta(this.participants);

      if (!assignment) {
        alert("No assignment could be made!");
      } else {
        const encodedAssignments = btoa(JSON.stringify(assignment));
        const groupNameParam = encodeURIComponent(this.groupName.trim());
        this.assignmentLink =
          location.protocol +
          "//" +
          location.host +
          location.pathname +
          `?assignments=${encodedAssignments}&groupName=${groupNameParam}`;
      }
    },

    verifyConfig() {
      const messages = getMessagesForConfig(this.participants);
      this.errorMessage = messages.error;
      this.warningMessage = messages.warning;
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
