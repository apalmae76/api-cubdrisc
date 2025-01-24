import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

function validateFile(value: Express.Multer.File) {
  if (!value || !value.buffer) {
    throw new BadRequestException({
      message: ['validation.profile.USER_IDENTITY_IMG'],
    });
  }

  const fileTypeRegex = /(jpg|jpeg|png)$/;
  if (!fileTypeRegex.test(value.originalname.toLowerCase())) {
    throw new BadRequestException({
      message: ['validation.profile.USER_IDENTITY_IMG_TYPE'],
    });
  }

  const maxSize = 1000 * 1024; // 1 MB
  if (value.size > maxSize) {
    throw new BadRequestException({
      message: [
        `validation.profile.USER_IDENTITY_IMG_SIZE|{"maxSize":"${maxSize}KB"}`,
      ],
    });
  }
}

@Injectable()
export class FileValidationPipe implements PipeTransform {
  async transform(value: Express.Multer.File) {
    validateFile(value);
    return value;
  }
}

@Injectable()
export class OptionalFileValidationPipe implements PipeTransform {
  async transform(value: Express.Multer.File) {
    if (value === undefined || !value) {
      return null;
    }

    validateFile(value);

    return value;
  }
}
