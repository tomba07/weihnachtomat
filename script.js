class BipartiteGraph {
  constructor(size) {
    this.adjList = new Array(size).fill().map(() => []);
    this.pair = new Array(size).fill(-1);
    this.dist = new Array(size).fill(-1);
  }

  createWarnings = (participants) => {
    let singleOptions = [];
    let halfSize = this.adjList.length / 2;

    for (let i = 0; i < halfSize; i++) {
      if (this.adjList[i].length === 1) {
        singleOptions.push(participants[i]);
      }
    }

    return { singleOptions };
  };

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

  getPairs(participants) {
    let resultObj = {};
    let half = participants.length;

    // Since participants can have multiple pairs, we store them in an array
    this.pair.slice(0, half).forEach((p, i) => {
      if (p !== -1) {
        const giverName = participants[Math.floor(i / 2)].name; // Divide by 2 because they can appear twice in the giver list
        const receiverName = participants[p - half].name;

        if (!resultObj[giverName]) {
          resultObj[giverName] = [];
        }

        resultObj[giverName].push(receiverName);
      }
    });

    return resultObj;
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

    init() {
      this.loadNameEntries();
      document.addEventListener("keydown", this.closeOnEscape.bind(this));
      this.$refs.nameInput.focus();
      const urlParams = new URLSearchParams(window.location.search);
      const encodedAssignments = urlParams.get("assignments");
      if (encodedAssignments) {
        this.decodedAssignments = JSON.parse(atob(encodedAssignments));
      }
    },

    saveNameEntries() {
      localStorage.setItem("nameEntries", JSON.stringify(this.nameEntries));
    },

    loadNameEntries() {
      try {
        const savedEntries = localStorage.getItem("nameEntries");

        if (savedEntries) {
          this.nameEntries = JSON.parse(savedEntries);
          this.verifySingleOptions();
        }
      } catch (e) {
        console.warn("Loading Name Entries Failed. Removing name entries from localStorage.")
        localStorage.removeItem("nameEntries");
      }
    },

    updateNameEntries() {
      this.saveNameEntries();
      this.verifySingleOptions();
      //Remove assignment link since no longer valid
      this.assignmentLink = "";
    },

    isObjectEmpty(objectName) {
      return Object.keys(objectName).length === 0;
    },

    closeOnEscape(event) {
      if (event.key === "Escape" || event.keyCode === 27) {
        this.exclusionDialogVisible = false;
        this.assignmentLink = '';
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
        const namesList = document.getElementById('names-list');
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
      if (this.nameEntries?.length < 2 || this.error) {
        return;
      }
      const assignmentsDict = this.secretSanta();

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

    shuffleArray(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    },

    secretSanta() {
      // Calculate the total number of gifts to be given
      const totalGifts = this.nameEntries.reduce((acc, entry) => acc + entry.numberOfGifts, 0),
        shuffledNames = this.shuffleArray([...this.nameEntries]);

      // Create a bipartite graph: the size should be the totalGifts for givers and nameEntries.length for receivers
      const graph = new BipartiteGraph(totalGifts + this.nameEntries.length);

      let giverIndex = 0; // This index will keep track of the position in the graph for each gift giver entry
      // Build the graph edges based on numberOfGifts and exclusions
      shuffledNames.forEach((giver, giverIdx) => {
        for (let giftCount = 0; giftCount < giver.numberOfGifts; giftCount++) {
          shuffledNames.forEach((receiver, receiverIdx) => {
            // Ensure the giver is not giving a gift to themselves or to someone in their exclusions
            if (giver.name !== receiver.name && !giver.exclusions.includes(receiver.name)) {
              // Connect this instance of the giver to the receiver in the graph
              graph.addEdge(giverIndex, totalGifts + receiverIdx);
            }
          });
          giverIndex++;
        }
      });

      // Run the Hopcroft-Karp algorithm to find the maximum matching
      const matching = graph.hopcroftKarp();

      // Check if the total matching is equal to the total number of gifts to be given
      if (matching === totalGifts) {
        // Retrieve and return the pairs
        let pairs = {};
        for (let i = 0; i < totalGifts; i++) {
          if (graph.pair[i] !== -1) {
            // The receiver's index is the pair's index minus the totalGifts offset
            let receiverIndex = graph.pair[i] - totalGifts;
            let receiverName = shuffledNames[receiverIndex].name;

            // Find the giver's name by looking up which index range they fall into
            let giverName = '';
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
        console.error('Not all participants can be matched with the given constraints.');
        return null;
      }
    },

    removeAssignmentsFromURL() {
      const url = new URL(window.location);
      url.searchParams.delete("assignments");
      window.location.href = url;
    },

    verifySingleOptions() {
      const names = this.nameEntries.map((entry) => entry.name),
        exclusions = this.nameEntries.reduce((acc, entry) => {
          acc[entry.name] = entry.exclusions;
          return acc;
        }, {});

      const graph = new BipartiteGraph(names.length * 2);

      // Populate the graph with edges that are not excluded
      names.forEach((name, i) => {
        names.forEach((otherName, j) => {
          if (i !== j && !(exclusions[name] && exclusions[name].includes(otherName))) {
            graph.addEdge(i, names.length + j);
          }
        });
      });

      const maxMatching = graph.hopcroftKarp();
      const warnings = graph.createWarnings(names);

      // Reset error and warning messages before checking
      this.error = "";
      this.warning = "";

      if (maxMatching !== names.length) {
        // Error: not all names can be matched due to exclusions
        this.error = "It's not possible to make a complete assignment with the current exclusions. Please review the exclusions.";
      } else if (warnings.singleOptions.length > 0) {
        // Warning: some participants have only one possible match
        this.warning = "Warning: Some participants have only one possible match. This can lead to predictable results.";
      }
    }
  };
}
