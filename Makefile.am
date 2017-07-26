AUX_DIST_GEN =                          \
        $(ac_aux_dir)/install-sh        \
        $(ac_aux_dir)/missing

DOC_FILES=                              \
        README                          \
        README.Music                    \
        NEWS                            \
        PHILOSOPHY                      \
        ChangeLog

EXTRA_DIST=                             \
        $(AUX_DIST_GEN)                 \
        $(MSVC_FILES)                   \
        $(CODEBLOCKS_FILES)             \
        $(DOC_FILES)                    \
        NOT-BUGS                        \
        README.Strife                   \
        .lvimrc                         \
        HACKING                         \
        TODO                            \
        rpm.spec

doomdocsdir = ${docdir}/../${PROGRAM_PREFIX}doom
doomdocs_DATA = $(DOC_FILES) NOT-BUGS

MAINTAINERCLEANFILES =  $(AUX_DIST_GEN)

SUBDIRS=textscreen opl pcsound data src

DIST_SUBDIRS=

if HAVE_PYTHON

INSTALL : man/INSTALL.template man/simplecpp
	./man/simplecpp -DDOOM \
	                < man/INSTALL.template > $@

endif

