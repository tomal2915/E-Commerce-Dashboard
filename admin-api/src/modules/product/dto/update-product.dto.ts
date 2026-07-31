// src/modules/product/dto/update-product.dto.ts
import { CreateProductDto } from './create-product.dto';

// Full-replace strategy: the frontend sends the complete desired state on
// every save (same shape as create), so PUT simply reuses CreateProductDto's
// validation rules rather than requiring a separate PartialType variant.
export class UpdateProductDto extends CreateProductDto {}
