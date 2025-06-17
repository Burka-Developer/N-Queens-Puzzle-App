from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
import time
import threading
import copy

app = Flask(__name__)
app.config['SECRET_KEY'] = 'nqueens_secret_key'
socketio = SocketIO(app, cors_allowed_origins="*")

class NQueensSolver:
    def __init__(self, n, speed=0.1):
        self.n = n
        self.board = [[0 for _ in range(n)] for _ in range(n)]
        self.solutions = []
        self.attempts = 0
        self.speed = speed
        self.solving = False
        self.start_time = 0
        
    def is_safe(self, row, col):
        # Check this row on left side
        for i in range(col):
            if self.board[row][i] == 1:
                return False
        
        # Check upper diagonal on left side
        for i, j in zip(range(row, -1, -1), range(col, -1, -1)):
            if self.board[i][j] == 1:
                return False
        
        # Check lower diagonal on left side
        for i, j in zip(range(row, self.n, 1), range(col, -1, -1)):
            if self.board[i][j] == 1:
                return False
        
        return True
    
    def solve_nqueens(self, col=0):
        if not self.solving:
            return False
            
        if col >= self.n:
            self.solutions.append(copy.deepcopy(self.board))
            return True
        
        for row in range(self.n):
            if not self.solving:
                return False
                
            self.attempts += 1
            
            if self.is_safe(row, col):
                self.board[row][col] = 1
                
                # Emit current state
                socketio.emit('board_update', {
                    'board': self.board,
                    'attempts': self.attempts,
                    'time_elapsed': time.time() - self.start_time,
                    'current_position': {'row': row, 'col': col}
                })
                
                time.sleep(self.speed)
                
                if self.solve_nqueens(col + 1):
                    return True
                
                self.board[row][col] = 0
                
                # Emit backtrack state
                socketio.emit('board_update', {
                    'board': self.board,
                    'attempts': self.attempts,
                    'time_elapsed': time.time() - self.start_time,
                    'backtrack': True
                })
                
                time.sleep(self.speed)
        
        return False
    
    def start_solving(self):
        self.solving = True
        self.attempts = 0
        self.start_time = time.time()
        self.board = [[0 for _ in range(self.n)] for _ in range(self.n)]
        
        success = self.solve_nqueens()
        
        socketio.emit('solving_complete', {
            'success': success,
            'board': self.board,
            'attempts': self.attempts,
            'time_elapsed': time.time() - self.start_time,
            'solutions_found': len(self.solutions)
        })
        
        self.solving = False
    
    def stop_solving(self):
        self.solving = False

# Global solver instance
current_solver = None

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('start_solving')
def handle_start_solving(data):
    global current_solver
    
    n = data['size']
    speed = data['speed']
    
    current_solver = NQueensSolver(n, speed)
    
    # Start solving in a separate thread
    thread = threading.Thread(target=current_solver.start_solving)
    thread.daemon = True
    thread.start()

@socketio.on('stop_solving')
def handle_stop_solving():
    global current_solver
    if current_solver:
        current_solver.stop_solving()

@socketio.on('update_speed')
def handle_update_speed(data):
    global current_solver
    if current_solver:
        current_solver.speed = data['speed']

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
