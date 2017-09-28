description "A RESTful API for Doom"
dependencies SDL2 SDL2_mixer SDL2_net
# Use the current git remote and branch
variant latest fetch_git \
    $(git remote get-url origin) $(git branch)
build_autotools
