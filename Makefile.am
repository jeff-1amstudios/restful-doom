AUX_DIST_GEN =                          \
        $(ac_aux_dir)/install-sh        \
        $(ac_aux_dir)/missing

EXTRA_DIST=                             \
        $(AUX_DIST_GEN)                 \
        .lvimrc                         \
        rpm.spec

doomdocsdir = ${docdir}/../${PROGRAM_PREFIX}doom
doomdocs_DATA = $(DOC_FILES)

MAINTAINERCLEANFILES =  $(AUX_DIST_GEN)

SUBDIRS=textscreen opl pcsound data src

DIST_SUBDIRS=

if HAVE_PYTHON

INSTALL : man/INSTALL.template man/simplecpp
	./man/simplecpp -DDOOM \
	                < man/INSTALL.template > $@

endif

