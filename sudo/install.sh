set -e
set -u

{

    if [ -z "$(command -v sudo)" ]; then
        echo >&2 "Error: on Linux and BSD you should install sudo via the native package manager"
        echo >&2 "       for example: apt install -y sudo"
        exit 1
    else
        echo "'sudo' already installed"
    fi

}
