import { IsArray, IsInt, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkDeleteDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  @Type(() => Number)
  ids: number[];
}
