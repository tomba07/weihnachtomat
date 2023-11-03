class BipartiteGraph {
  constructor(size) {
    this.adjList = Array.from({ length: size }, () => []);
    this.pair = Array.from({ length: size }, () => -1);
    this.dist = Array.from({ length: size }, () => -1);
  }

  createWarnings = function (participants) {
    let singleOptions = [];

    for (let i = 0; i < this.adjList.length / 2; i++) {
      if (this.adjList[i].length === 1) {
        singleOptions.push(participants[i]);
      }
    }

    return { singleOptions };
  };

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
      const name = this.newName.trim();

      if (!name || name.length === 0) {
        alert("Please enter a valid name.");
      }else if(this.nameEntries.some((entry) => entry.name === name)){
        alert("Please enter a unique name.");
      }else{
        this.nameEntries.push({ name: name, exclusions: [] });
        this.newName = "";
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
      this.verifySingleOptions();
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
      this.verifySingleOptions();
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

      const count = graph.hopcroftKarp();

      return count === participants.length ? graph.getPairs(participants) : null;
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
      
        if (maxMatching !== names.length) {
          alert("It's not possible to make a complete assignment with the current exclusions. Please review the exclusions.");
        }else if (warnings.singleOptions.length > 0) {
          alert("Warning: Some participants have only one possible match. This can lead to predictable results.");
        }
      }
  };
}
