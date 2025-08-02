#!/bin/bash

# Virgil Environment Checker
# Validates the development environment and provides diagnostic information

set -euo pipefail

# Configuration
readonly PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly MIN_NODE_VERSION=18
readonly MIN_NPM_VERSION=8

# Colors for output
if [[ -t 1 ]] && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
    readonly RED='\033[0;31m'
    readonly GREEN='\033[0;32m'
    readonly YELLOW='\033[1;33m'
    readonly BLUE='\033[0;34m'
    readonly MAGENTA='\033[0;35m'
    readonly CYAN='\033[0;36m'
    readonly NC='\033[0m'
else
    readonly RED='' GREEN='' YELLOW='' BLUE='' MAGENTA='' CYAN='' NC=''
fi

# Logging functions
log_info() { echo -e "${BLUE}ℹ${NC}  $*"; }
log_success() { echo -e "${GREEN}✅${NC} $*"; }
log_warning() { echo -e "${YELLOW}⚠️${NC}  $*"; }
log_error() { echo -e "${RED}❌${NC} $*"; }
log_section() { echo -e "\n${CYAN}═══ $* ═══${NC}"; }

# Platform detection
detect_platform() {
    case "$OSTYPE" in
        darwin*) echo "macOS" ;;
        linux*) echo "Linux" ;;
        msys*|cygwin*|mingw*) echo "Windows" ;;
        *) echo "Unknown" ;;
    esac
}

# Version comparison
version_gte() {
    # Returns 0 if $1 >= $2
    printf '%s\n%s' "$2" "$1" | sort -V -C
}

# Check command availability
check_command() {
    local cmd="$1"
    local name="${2:-$cmd}"
    
    if command -v "$cmd" >/dev/null 2>&1; then
        log_success "$name is installed"
        return 0
    else
        log_error "$name is not installed"
        return 1
    fi
}

# System information
show_system_info() {
    log_section "System Information"
    
    echo "Platform: $(detect_platform)"
    echo "Architecture: $(uname -m)"
    echo "OS Version: $(uname -r)"
    
    if [[ -f /etc/os-release ]]; then
        echo "Distribution: $(grep PRETTY_NAME /etc/os-release | cut -d'"' -f2)"
    fi
    
    echo "Current User: $(whoami)"
    echo "Home Directory: $HOME"
    echo "Current Directory: $PWD"
}

# Node.js and npm checks
check_node_npm() {
    log_section "Node.js and npm"
    
    local has_issues=false
    
    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node -v | sed 's/v//')
        local node_major=$(echo "$node_version" | cut -d. -f1)
        
        if [[ $node_major -ge $MIN_NODE_VERSION ]]; then
            log_success "Node.js v$node_version (meets minimum v$MIN_NODE_VERSION)"
        else
            log_warning "Node.js v$node_version (minimum v$MIN_NODE_VERSION recommended)"
            has_issues=true
        fi
    else
        log_error "Node.js is not installed"
        echo "  Install from: https://nodejs.org/"
        has_issues=true
    fi
    
    # Check npm
    if command -v npm >/dev/null 2>&1; then
        local npm_version=$(npm -v)
        local npm_major=$(echo "$npm_version" | cut -d. -f1)
        
        if [[ $npm_major -ge $MIN_NPM_VERSION ]]; then
            log_success "npm v$npm_version (meets minimum v$MIN_NPM_VERSION)"
        else
            log_warning "npm v$npm_version (minimum v$MIN_NPM_VERSION recommended)"
            has_issues=true
        fi
    else
        log_error "npm is not installed"
        has_issues=true
    fi
    
    # Check global packages
    if command -v npm >/dev/null 2>&1; then
        echo
        echo "Global npm packages:"
        npm list -g --depth=0 2>/dev/null | grep -E "(nodemon|typescript|vite)" || echo "  None of interest found"
    fi
    
    return $([ "$has_issues" = true ] && echo 1 || echo 0)
}

# Project structure checks
check_project_structure() {
    log_section "Project Structure"
    
    local has_issues=false
    
    # Check essential files
    local essential_files=(
        "package.json"
        "server/package.json"
        "tsconfig.json"
        "vite.config.ts"
        "index.html"
    )
    
    for file in "${essential_files[@]}"; do
        if [[ -f "$PROJECT_ROOT/$file" ]]; then
            log_success "$file exists"
        else
            log_error "$file is missing"
            has_issues=true
        fi
    done
    
    # Check essential directories
    local essential_dirs=(
        "src"
        "server"
        "public"
    )
    
    echo
    for dir in "${essential_dirs[@]}"; do
        if [[ -d "$PROJECT_ROOT/$dir" ]]; then
            log_success "$dir/ directory exists"
        else
            log_error "$dir/ directory is missing"
            has_issues=true
        fi
    done
    
    return $([ "$has_issues" = true ] && echo 1 || echo 0)
}

# Environment file checks
check_env_files() {
    log_section "Environment Configuration"
    
    local has_issues=false
    
    # Check .env file
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        log_success ".env file exists"
        
        # Check for required variables
        local required_vars=(
            "VITE_SUPABASE_URL"
            "VITE_SUPABASE_ANON_KEY"
        )
        
        local optional_vars=(
            "VITE_OPENWEATHERMAP_API_KEY"
            "ANTHROPIC_API_KEY"
        )
        
        echo
        echo "Required environment variables:"
        for var in "${required_vars[@]}"; do
            if grep -q "^${var}=" "$PROJECT_ROOT/.env"; then
                local value=$(grep "^${var}=" "$PROJECT_ROOT/.env" | cut -d'=' -f2)
                if [[ -n "$value" && "$value" != '""' && "$value" != "''" ]]; then
                    log_success "$var is set"
                else
                    log_warning "$var is empty"
                    has_issues=true
                fi
            else
                log_error "$var is missing"
                has_issues=true
            fi
        done
        
        echo
        echo "Optional environment variables:"
        for var in "${optional_vars[@]}"; do
            if grep -q "^${var}=" "$PROJECT_ROOT/.env"; then
                local value=$(grep "^${var}=" "$PROJECT_ROOT/.env" | cut -d'=' -f2)
                if [[ -n "$value" && "$value" != '""' && "$value" != "''" ]]; then
                    log_success "$var is set"
                else
                    log_warning "$var is empty"
                fi
            else
                log_info "$var is not set (optional)"
            fi
        done
    else
        log_error ".env file is missing"
        
        if [[ -f "$PROJECT_ROOT/.env.example" ]]; then
            echo "  You can create one from the example:"
            echo "  cp .env.example .env"
        fi
        has_issues=true
    fi
    
    # Check .env.example
    echo
    if [[ -f "$PROJECT_ROOT/.env.example" ]]; then
        log_success ".env.example file exists"
    else
        log_warning ".env.example file is missing"
    fi
    
    return $([ "$has_issues" = true ] && echo 1 || echo 0)
}

# Dependencies check
check_dependencies() {
    log_section "Dependencies"
    
    local has_issues=false
    
    # Check frontend dependencies
    if [[ -d "$PROJECT_ROOT/node_modules" ]]; then
        log_success "Frontend node_modules exists"
        
        # Check if it's up to date
        if [[ "$PROJECT_ROOT/package.json" -nt "$PROJECT_ROOT/node_modules" ]]; then
            log_warning "package.json is newer than node_modules (run npm install)"
            has_issues=true
        fi
        
        # Count packages
        local pkg_count=$(find "$PROJECT_ROOT/node_modules" -maxdepth 1 -type d | wc -l)
        echo "  Package count: $((pkg_count - 1))"
    else
        log_warning "Frontend node_modules is missing (run npm install)"
        has_issues=true
    fi
    
    # Check backend dependencies
    echo
    if [[ -d "$PROJECT_ROOT/server/node_modules" ]]; then
        log_success "Backend node_modules exists"
        
        # Check if it's up to date
        if [[ "$PROJECT_ROOT/server/package.json" -nt "$PROJECT_ROOT/server/node_modules" ]]; then
            log_warning "server/package.json is newer than node_modules (run npm install)"
            has_issues=true
        fi
        
        # Count packages
        local pkg_count=$(find "$PROJECT_ROOT/server/node_modules" -maxdepth 1 -type d | wc -l)
        echo "  Package count: $((pkg_count - 1))"
    else
        log_warning "Backend node_modules is missing (run cd server && npm install)"
        has_issues=true
    fi
    
    return $([ "$has_issues" = true ] && echo 1 || echo 0)
}

# Port availability check
check_ports() {
    log_section "Port Availability"
    
    local frontend_port="${FRONTEND_PORT:-3000}"
    local backend_port="${BACKEND_PORT:-5002}"
    
    # Function to check if port is in use
    is_port_in_use() {
        local port="$1"
        
        if command -v lsof >/dev/null 2>&1; then
            lsof -i ":$port" -sTCP:LISTEN >/dev/null 2>&1
        elif command -v netstat >/dev/null 2>&1; then
            netstat -an | grep -q "[:.]$port .*LISTEN"
        else
            nc -z localhost "$port" 2>/dev/null
        fi
    }
    
    # Check frontend port
    if is_port_in_use "$frontend_port"; then
        log_warning "Port $frontend_port (frontend) is in use"
        
        if command -v lsof >/dev/null 2>&1; then
            echo "  Process using port:"
            lsof -i ":$frontend_port" | grep LISTEN | head -2 | sed 's/^/    /'
        fi
    else
        log_success "Port $frontend_port (frontend) is available"
    fi
    
    # Check backend port
    if is_port_in_use "$backend_port"; then
        log_warning "Port $backend_port (backend) is in use"
        
        if command -v lsof >/dev/null 2>&1; then
            echo "  Process using port:"
            lsof -i ":$backend_port" | grep LISTEN | head -2 | sed 's/^/    /'
        fi
    else
        log_success "Port $backend_port (backend) is available"
    fi
}

# Development tools check
check_dev_tools() {
    log_section "Development Tools"
    
    # Check for common tools
    check_command "git" "Git"
    check_command "curl" "cURL"
    
    # Platform-specific tools
    local platform=$(detect_platform)
    if [[ "$platform" == "macOS" ]] || [[ "$platform" == "Linux" ]]; then
        check_command "lsof" "lsof (port checker)"
    fi
    
    # Optional but useful tools
    echo
    echo "Optional tools:"
    check_command "jq" "jq (JSON processor)" || echo "  Install: brew install jq (macOS) or apt install jq (Ubuntu)"
    check_command "tree" "tree (directory viewer)" || echo "  Install: brew install tree (macOS) or apt install tree (Ubuntu)"
}

# File permissions check
check_permissions() {
    log_section "File Permissions"
    
    local has_issues=false
    
    # Check if we can write to important directories
    local dirs_to_check=(
        "."
        "logs"
        ".pids"
        "node_modules"
        "server/node_modules"
    )
    
    for dir in "${dirs_to_check[@]}"; do
        local full_path="$PROJECT_ROOT/$dir"
        if [[ -d "$full_path" ]] || [[ "$dir" == "." ]]; then
            if [[ -w "$full_path" ]]; then
                log_success "$dir is writable"
            else
                log_error "$dir is not writable"
                has_issues=true
            fi
        fi
    done
    
    # Check script permissions
    echo
    echo "Script permissions:"
    for script in start-dev.sh cleanup-ports.sh check-env.sh; do
        if [[ -f "$PROJECT_ROOT/$script" ]]; then
            if [[ -x "$PROJECT_ROOT/$script" ]]; then
                log_success "$script is executable"
            else
                log_warning "$script is not executable (run: chmod +x $script)"
                has_issues=true
            fi
        fi
    done
    
    return $([ "$has_issues" = true ] && echo 1 || echo 0)
}

# Summary and recommendations
show_summary() {
    local has_issues="$1"
    
    log_section "Summary"
    
    if [[ "$has_issues" == "true" ]]; then
        log_warning "Some issues were found. Please address them before starting development."
        echo
        echo "Quick fixes:"
        echo "1. Install dependencies: npm install && cd server && npm install && cd .."
        echo "2. Create .env file: cp .env.example .env"
        echo "3. Make scripts executable: chmod +x *.sh"
        echo "4. Check port usage: ./cleanup-ports.sh"
    else
        log_success "Environment looks good! You're ready to start development."
        echo
        echo "Start Virgil with: ./start-dev.sh"
    fi
}

# Main function
main() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║           Virgil Environment Checker                       ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    
    local has_issues=false
    
    # Run all checks
    show_system_info
    
    check_node_npm || has_issues=true
    check_project_structure || has_issues=true
    check_env_files || has_issues=true
    check_dependencies || has_issues=true
    check_ports
    check_dev_tools
    check_permissions || has_issues=true
    
    # Show summary
    show_summary "$has_issues"
    
    # Exit with appropriate code
    [[ "$has_issues" == "true" ]] && exit 1 || exit 0
}

# Run main function
main "$@"