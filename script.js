class BipartiteGraph {
  constructor(size) {
    this.adjList = Array.from({ length: size }, () => []);
    this.pair = Array.from({ length: size }, () => -1);
    this.dist = Array.from({ length: size }, () => -1);
  }

  addEdge(u, v) {
    this.adjList[u].push(v);
  }

  bfs() {
    let queue = [];
    for (let u = 0; u < this.pair.length / 2; u++) {
      if (this.pair[u] === -1) {
        this.dist[u] = 0;
        queue.push(u);
      } else {
        this.dist[u] = Infinity;
      }
    }
    this.dist[-1] = Infinity;
    while (queue.length > 0) {
      let u = queue.shift();
      if (u !== -1) {
        for (let v of this.adjList[u]) {
          if (this.dist[this.pair[v]] === Infinity) {
            this.dist[this.pair[v]] = this.dist[u] + 1;
            queue.push(this.pair[v]);
          }
        }
      }
    }
    return this.dist[-1] !== Infinity;
  }

  dfs(u) {
    if (u !== -1) {
      for (let v of this.adjList[u]) {
        if (this.dist[this.pair[v]] === this.dist[u] + 1) {
          if (this.dfs(this.pair[v])) {
            this.pair[v] = u;
            this.pair[u] = v;
            return true;
          }
        }
      }
      this.dist[u] = Infinity;
      return false;
    }
    return true;
  }

  hopcroftKarp() {
    let matching = 0;
    while (this.bfs()) {
      for (let u = 0; u < this.pair.length / 2; u++) {
        if (this.pair[u] === -1 && this.dfs(u)) {
          matching++;
        }
      }
    }
    return matching;
  }

  getPairs(participants) {
    let half = this.pair.length / 2;
    let resultObj = {};
    for (let i = 0; i < half; i++) {
      if (this.pair[i] !== -1) {
        resultObj[participants[i]] = participants[this.pair[i] - half];
      }
    }
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
        assignmentsDict = this.secretSanta(names, exclusions);

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

    secretSanta(participants, exclusionsObj) {
      const graph = new BipartiteGraph(participants.length * 2);

      // Shuffle the participants to randomize the results
      participants.sort(() => (Math.random() > 0.5 ? 1 : -1));

      // Build the graph edges based on exclusions
      for (let i = 0; i < participants.length; i++) {
        for (let j = participants.length; j < participants.length * 2; j++) {
          // Ensure i and j-participants.length are not the same and not in each other's exclusion list
          if (i !== j - participants.length && !(exclusionsObj[participants[i]] && exclusionsObj[participants[i]].includes(participants[j - participants.length]))) {
            graph.addEdge(i, j);
          }
        }
      }

      graph.hopcroftKarp();

      return graph.getPairs(participants);
    },

    removeAssignmentsFromURL() {
      const url = new URL(window.location);
      url.searchParams.delete("assignments");
      window.location.href = url;
    }
  };
}
