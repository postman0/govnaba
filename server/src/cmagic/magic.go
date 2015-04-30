package cmagic

// #cgo LDFLAGS: -lmagic
// #include <stdlib.h>
// #include <magic.h>
import "C"
import (
	"errors"
	"strings"
	"unsafe"
)

const (
	MagicNone            = C.MAGIC_NONE
	MagicDebug           = C.MAGIC_DEBUG
	MagicSymlink         = C.MAGIC_SYMLINK
	MagicCompress        = C.MAGIC_COMPRESS
	MagicDevices         = C.MAGIC_DEVICES
	MagicMimeType        = C.MAGIC_MIME_TYPE
	MagicMimeEncoding    = C.MAGIC_MIME_ENCODING
	MagicMime            = C.MAGIC_MIME
	MagicContinue        = C.MAGIC_CONTINUE
	MagicCheck           = C.MAGIC_CHECK
	MagicPreserveAtime   = C.MAGIC_PRESERVE_ATIME
	MagicRaw             = C.MAGIC_RAW
	MagicError           = C.MAGIC_ERROR
	MagicApple           = C.MAGIC_APPLE
	MagicNoCheckAppType  = C.MAGIC_NO_CHECK_APPTYPE
	MagicNoCheckCDF      = C.MAGIC_NO_CHECK_CDF
	MagicNoCheckCompress = C.MAGIC_NO_CHECK_COMPRESS
	MagicNoCheckELF      = C.MAGIC_NO_CHECK_ELF
	MagicNoCheckEncoding = C.MAGIC_NO_CHECK_ENCODING
	MagicNoCheckSoft     = C.MAGIC_NO_CHECK_SOFT
	MagicNoCheckTar      = C.MAGIC_NO_CHECK_TAR
	MagicNoCheckText     = C.MAGIC_NO_CHECK_TEXT
	MagicNoCheckTokens   = C.MAGIC_NO_CHECK_TOKENS
)

type Magic struct {
	cookie C.magic_t
}

func NewMagic(flags int) (*Magic, error) {
	m := &Magic{C.magic_open(C.int(flags))}
	if m.cookie == nil {
		return nil, errors.New(C.GoString(C.magic_error(m.cookie)))
	}
	return m, nil
}

func (m *Magic) Close() {
	C.magic_close(m.cookie)
}

func (m *Magic) LoadDatabases(dbFilenames []string) error {
	var result C.int
	if dbFilenames == nil {
		result = C.magic_load(m.cookie, nil)
	} else {
		arg := C.CString(strings.Join(dbFilenames, ","))
		defer C.free(unsafe.Pointer(arg))
		result = C.magic_load(m.cookie, arg)
	}
	if result == 0 {
		return nil
	} else {
		return errors.New(C.GoString(C.magic_error(m.cookie)))
	}
}

func (m *Magic) File(filename string) (string, error) {
	str := C.magic_file(m.cookie, C.CString(filename))
	if str == nil {
		return "", errors.New(C.GoString(C.magic_error(m.cookie)))
	}
	return C.GoString(str), nil
}

func (m *Magic) Buffer(data []byte) (string, error) {
	cstr := C.magic_buffer(m.cookie, unsafe.Pointer(&data[0]), C.size_t(len(data)))
	errstr := C.magic_error(m.cookie)
	if errstr != nil {
		return "", errors.New(C.GoString(errstr))
	} else {
		return C.GoString(cstr), nil
	}
}
