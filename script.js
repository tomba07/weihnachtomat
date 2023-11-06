function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

class BipartiteGraph {
  constructor(size) {
    this.adjList = new Array(size).fill().map(() => []);
    this.pair = new Array(size).fill(-1);
    this.dist = new Array(size).fill(-1);
  }

  shuffleAdjList() {
    this.adjList.forEach((edges) => {
      shuffleArray(edges);
    });
  }

  addEdge(u, v) {
    if (u < 0 || u >= this.adjList.length || v < 0 || v >= this.adjList.length) {
      throw new Error("Edge indices are out of bounds.");
    }
    this.adjList[u].push(v);
  }

  bfs() {
    this.dist.fill(Infinity);
    let queue = [];

    this.pair.map((p, u) => {
      if (p === -1) {
        this.dist[u] = 0;
        queue.push(u);
      }
    });

    this.dist[-1] = Infinity;

    while (queue.length > 0) {
      let u = queue.shift();
      if (u !== -1) {
        this.adjList[u].forEach((v) => {
          if (this.dist[this.pair[v]] === Infinity) {
            this.dist[this.pair[v]] = this.dist[u] + 1;
            queue.push(this.pair[v]);
          }
        });
      }
    }
    return this.dist[-1] !== Infinity;
  }

  dfs(u) {
    if (u !== -1) {
      return this.adjList[u].some((v) => {
        if (this.dist[this.pair[v]] === this.dist[u] + 1) {
          if (this.dfs(this.pair[v])) {
            this.pair[v] = u;
            this.pair[u] = v;
            return true;
          }
        }
      });
    }
    return true;
  }

  hopcroftKarp() {
    this.shuffleAdjList();
    let matching = 0;
    while (this.bfs()) {
      this.pair.forEach((p, u) => {
        if (p === -1 && this.dfs(u)) {
          matching++;
        }
      });
    }
    return matching;
  }
}

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

    isObjectEmpty(objectName) {
      return Object.keys(objectName).length === 0;
    },

    closeOnEscape(event) {
      if (event.key === "Escape" || event.keyCode === 27) {
        this.exclusionDialogVisible = false;
        this.assignmentLink = "";
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
      this.$refs.nameInput.focus();
    },

    removeName(nameEntry) {
      const index = this.nameEntries.indexOf(nameEntry);

      if (index > -1) {
        this.nameEntries.splice(index, 1);
      }
      this.availableExclusions = this.nameEntries.map((entry) => entry.name).filter(Boolean);
      //remove name from exclusions
      this.nameEntries.forEach((entry) => {
        this.removeExclusion(entry, nameEntry.name);
      });
      this.updateNameEntries();
      this.$refs.nameInput.focus();
    },

    removeExclusion(nameEntry, exclusion) {
      const index = nameEntry.exclusions.indexOf(exclusion);

      if (index > -1) {
        nameEntry.exclusions.splice(index, 1);
      }
      this.updateNameEntries();
    },

    assign() {
      if (this.nameEntries?.length < 3 || this.error) {
        return;
      }
      const assignmentsDict = this.secretSantaWithRetries();

      console.log(assignmentsDict);

      if (!assignmentsDict) {
        alert("No assignment could be made!");
        return;
      }
      // Encode the assignments to Base64
      const encodedAssignments = btoa(JSON.stringify(assignmentsDict));
      this.assignmentLink = location.protocol + "//" + location.host + location.pathname + "?assignments=" + encodedAssignments;
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

    secretSantaWithRetries(retries = 10) {
      let assignment;
      for (let attempt = 0; attempt < retries; attempt++) {
        assignment = this.secretSanta();
        if (assignment) {
          break;
        } else {
          console.warn(`Attempt ${attempt + 1} failed. Retrying...`);
        }
      }
      return assignment;
    },

    secretSanta() {
      const numberOfParticipants = this.nameEntries.length,
        //For some reason, cloning with Alpine JS does not work properly, so using this workaround
        clonedNames = this.nameEntries.map((entry) => {
          return {
            name: entry.name,
            numberOfGifts: entry.numberOfGifts,
            exclusions: entry.exclusions
          };
        }),
        shuffledNames = shuffleArray(clonedNames);

      shuffledNames.forEach((entry) => {
        if (entry.exclusions.length === numberOfParticipants - 1) {
          entry.numberOfGifts = 0;
        }
      });

      // Calculate the total number of gifts before adjustments
      let totalGifts = shuffledNames.reduce((sum, entry) => sum + entry.numberOfGifts, 0);

      // Reduce the numberOfGifts in a fair manner until totalGifts equals numberOfParticipants
      while (totalGifts > numberOfParticipants) {
        // Find the entry with the highest numberOfGifts
        let maxGiftsEntry = shuffledNames.reduce((prev, current) => (prev.numberOfGifts > current.numberOfGifts ? prev : current));

        // Decrement the numberOfGifts for the entry with the highest number
        maxGiftsEntry.numberOfGifts--;
        totalGifts--;
      }

      const graph = new BipartiteGraph(numberOfParticipants * 2);

      let giverIndex = 0; // This index will keep track of the position in the graph for each gift giver entry
      // Build the graph edges based on numberOfGifts and exclusions
      shuffledNames.forEach((giver, giverIdx) => {
        for (let giftCount = 0; giftCount < giver.numberOfGifts; giftCount++) {
          shuffledNames.forEach((receiver, receiverIdx) => {
            // Ensure the giver is not giving a gift to themselves or to someone in their exclusions
            if (giver.name !== receiver.name && !giver.exclusions.includes(receiver.name)) {
              // Connect this instance of the giver to the receiver in the graph
              graph.addEdge(giverIndex, numberOfParticipants + receiverIdx);
            }
          });
          giverIndex++;
        }
      });

      // Run the Hopcroft-Karp algorithm to find the maximum matching
      const matching = graph.hopcroftKarp();

      if (matching === numberOfParticipants) {
        // Retrieve and return the pairs
        let pairs = {};
        for (let i = 0; i < numberOfParticipants; i++) {
          if (graph.pair[i] !== -1) {
            // The receiver's index is the pair's index minus the totalGifts offset
            let receiverIndex = graph.pair[i] - numberOfParticipants;
            let receiverName = shuffledNames[receiverIndex].name;

            // Find the giver's name by looking up which index range they fall into
            let giverName = "";
            let giftCounter = 0;
            for (let giverEntry of shuffledNames) {
              if (i >= giftCounter && i < giftCounter + giverEntry.numberOfGifts) {
                giverName = giverEntry.name;
                break;
              }
              giftCounter += giverEntry.numberOfGifts;
            }

            if (!pairs[giverName]) {
              pairs[giverName] = [];
            }
            pairs[giverName].push(receiverName);
          }
        }
        return pairs;
      } else {
        return null;
      }
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
      const names = this.nameEntries.map((entry) => entry.name);
      const totalGifts = this.nameEntries.reduce((sum, entry) => sum + entry.numberOfGifts, 0);

      this.warning = "";
      this.error = "";

      if (totalGifts < this.nameEntries.length) {
        const giftCountDifference = Math.abs(totalGifts - this.nameEntries.length);
        this.error = `Error: The total number of gifts (${totalGifts}) is less than the number of participants (${this.nameEntries.length}). Difference: ${giftCountDifference}.`;
      } else if (!this.secretSantaWithRetries()) {
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
  };
}
