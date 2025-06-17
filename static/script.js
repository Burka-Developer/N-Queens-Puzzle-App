class NQueensApp {
  constructor() {
    this.socket = io()
    this.currentSize = 8
    this.isRunning = false
    this.initializeElements()
    this.setupEventListeners()
    this.createBoard()
  }

  initializeElements() {
    this.boardSizeSelect = document.getElementById("boardSize")
    this.speedSlider = document.getElementById("speed")
    this.speedValue = document.getElementById("speedValue")
    this.startBtn = document.getElementById("startBtn")
    this.stopBtn = document.getElementById("stopBtn")
    this.chessboard = document.getElementById("chessboard")
    this.attemptsDisplay = document.getElementById("attempts")
    this.timeDisplay = document.getElementById("timeElapsed")
    this.statusDisplay = document.getElementById("status")
  }

  setupEventListeners() {
    // Board size change
    this.boardSizeSelect.addEventListener("change", (e) => {
      this.currentSize = Number.parseInt(e.target.value)
      this.createBoard()
    })

    // Speed slider
    this.speedSlider.addEventListener("input", (e) => {
      const speed = Number.parseFloat(e.target.value)
      this.speedValue.textContent = `${speed}s`
      if (this.isRunning) {
        this.socket.emit("update_speed", { speed: speed })
      }
    })

    // Control buttons
    this.startBtn.addEventListener("click", () => this.startSolving())
    this.stopBtn.addEventListener("click", () => this.stopSolving())

    // Socket events
    this.socket.on("board_update", (data) => this.updateBoard(data))
    this.socket.on("solving_complete", (data) => this.onSolvingComplete(data))
  }

  createBoard() {
    this.chessboard.innerHTML = ""
    this.chessboard.style.gridTemplateColumns = `repeat(${this.currentSize}, 1fr)`

    // Adjust square size based on board size
    const maxSize = Math.min(500, window.innerWidth - 40)
    const squareSize = Math.floor(maxSize / this.currentSize)

    for (let row = 0; row < this.currentSize; row++) {
      for (let col = 0; col < this.currentSize; col++) {
        const square = document.createElement("div")
        square.className = `square ${(row + col) % 2 === 0 ? "light" : "dark"}`
        square.style.width = `${squareSize}px`
        square.style.height = `${squareSize}px`
        square.dataset.row = row
        square.dataset.col = col
        this.chessboard.appendChild(square)
      }
    }
  }

  startSolving() {
    this.isRunning = true
    this.startBtn.disabled = true
    this.stopBtn.disabled = false
    this.boardSizeSelect.disabled = true
    this.statusDisplay.textContent = "Solving..."
    this.statusDisplay.parentElement.style.background = "linear-gradient(135deg, #ffeaa7, #fdcb6e)"

    // Reset stats
    this.attemptsDisplay.textContent = "0"
    this.timeDisplay.textContent = "0.00s"

    // Clear board
    this.createBoard()

    const speed = Number.parseFloat(this.speedSlider.value)
    this.socket.emit("start_solving", {
      size: this.currentSize,
      speed: speed,
    })
  }

  stopSolving() {
    this.isRunning = false
    this.startBtn.disabled = false
    this.stopBtn.disabled = false
    this.boardSizeSelect.disabled = false
    this.statusDisplay.textContent = "Stopped"
    this.statusDisplay.parentElement.style.background = "rgba(255, 255, 255, 0.95)"

    this.socket.emit("stop_solving")
  }

  updateBoard(data) {
    // Clear previous highlights
    document.querySelectorAll(".square").forEach((square) => {
      square.classList.remove("queen", "current", "backtrack")
      square.textContent = ""
    })

    // Update board state
    for (let row = 0; row < this.currentSize; row++) {
      for (let col = 0; col < this.currentSize; col++) {
        const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`)
        if (data.board[row][col] === 1) {
          square.classList.add("queen")
          square.textContent = "♛"
        }
      }
    }

    // Highlight current position
    if (data.current_position) {
      const currentSquare = document.querySelector(
        `[data-row="${data.current_position.row}"][data-col="${data.current_position.col}"]`,
      )
      if (currentSquare) {
        currentSquare.classList.add("current")
      }
    }

    // Show backtrack animation
    if (data.backtrack) {
      document.querySelectorAll(".queen").forEach((square) => {
        square.classList.add("backtrack")
      })
    }

    // Update stats
    this.attemptsDisplay.textContent = data.attempts.toLocaleString()
    this.timeDisplay.textContent = `${data.time_elapsed.toFixed(2)}s`
  }

  onSolvingComplete(data) {
    this.isRunning = false
    this.startBtn.disabled = false
    this.stopBtn.disabled = true
    this.boardSizeSelect.disabled = false

    if (data.success) {
      this.statusDisplay.textContent = "Solved! ✅"
      this.statusDisplay.parentElement.style.background = "linear-gradient(135deg, #00b894, #00cec9)"
    } else {
      this.statusDisplay.textContent = "No Solution"
      this.statusDisplay.parentElement.style.background = "linear-gradient(135deg, #ff7675, #fd79a8)"
    }

    // Final stats update
    this.attemptsDisplay.textContent = data.attempts.toLocaleString()
    this.timeDisplay.textContent = `${data.time_elapsed.toFixed(2)}s`

    // Show completion animation
    if (data.success) {
      document.querySelectorAll(".queen").forEach((square, index) => {
        setTimeout(() => {
          square.style.animation = "pulse 0.5s ease-in-out"
        }, index * 100)
      })
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new NQueensApp()
})

// Handle window resize
window.addEventListener("resize", () => {
  if (window.nqueensApp && !window.nqueensApp.isRunning) {
    window.nqueensApp.createBoard()
  }
})
