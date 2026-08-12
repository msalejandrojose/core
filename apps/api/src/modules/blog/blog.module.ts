import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';

// Ports
import { POST_REPOSITORY } from './application/ports/post-repository.port';
import { POST_CATEGORY_REPOSITORY } from './application/ports/post-category-repository.port';
import { POST_TAG_REPOSITORY } from './application/ports/post-tag-repository.port';

// Adapters (persistence)
import { PrismaPostRepository } from './infrastructure/persistence/prisma-post.repository';
import { PrismaPostCategoryRepository } from './infrastructure/persistence/prisma-post-category.repository';
import { PrismaPostTagRepository } from './infrastructure/persistence/prisma-post-tag.repository';

// Ports & adapter (deploy trigger de la web pública)
import { DEPLOY_TRIGGER } from './application/ports/deploy-trigger.port';
import { GithubDeployTriggerAdapter } from './infrastructure/deploy/github-deploy-trigger.adapter';

// Use cases — posts
import { CreatePostUseCase } from './application/use-cases/create-post.use-case';
import { UpdatePostUseCase } from './application/use-cases/update-post.use-case';
import { DeletePostUseCase } from './application/use-cases/delete-post.use-case';
import { PublishPostUseCase } from './application/use-cases/publish-post.use-case';
import { ArchivePostUseCase } from './application/use-cases/archive-post.use-case';
import { GetPostUseCase } from './application/use-cases/get-post.use-case';
import { ListPostsUseCase } from './application/use-cases/list-posts.use-case';
import { ListPublishedPostsUseCase } from './application/use-cases/list-published-posts.use-case';
import { GetPublicPostUseCase } from './application/use-cases/get-public-post.use-case';
// Use cases — categorías
import { CreateCategoryUseCase } from './application/use-cases/create-category.use-case';
import { UpdateCategoryUseCase } from './application/use-cases/update-category.use-case';
import { DeleteCategoryUseCase } from './application/use-cases/delete-category.use-case';
import { ListCategoriesUseCase } from './application/use-cases/list-categories.use-case';
// Use cases — etiquetas
import { CreateTagUseCase } from './application/use-cases/create-tag.use-case';
import { UpdateTagUseCase } from './application/use-cases/update-tag.use-case';
import { DeleteTagUseCase } from './application/use-cases/delete-tag.use-case';
import { ListTagsUseCase } from './application/use-cases/list-tags.use-case';

// HTTP
import { PostsController } from './infrastructure/http/posts.controller';
import { CategoriesController } from './infrastructure/http/categories.controller';
import { TagsController } from './infrastructure/http/tags.controller';
import { PublicBlogController } from './infrastructure/http/public-blog.controller';

@Module({
  // IamModule exporta JwtAuthGuard/PermissionGuard (usados por
  // @RequiresPermission en los controllers de administración).
  imports: [IamModule],
  controllers: [
    PostsController,
    CategoriesController,
    TagsController,
    PublicBlogController,
  ],
  providers: [
    { provide: POST_REPOSITORY, useClass: PrismaPostRepository },
    {
      provide: POST_CATEGORY_REPOSITORY,
      useClass: PrismaPostCategoryRepository,
    },
    { provide: POST_TAG_REPOSITORY, useClass: PrismaPostTagRepository },
    { provide: DEPLOY_TRIGGER, useClass: GithubDeployTriggerAdapter },

    CreatePostUseCase,
    UpdatePostUseCase,
    DeletePostUseCase,
    PublishPostUseCase,
    ArchivePostUseCase,
    GetPostUseCase,
    ListPostsUseCase,
    ListPublishedPostsUseCase,
    GetPublicPostUseCase,

    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
    ListCategoriesUseCase,

    CreateTagUseCase,
    UpdateTagUseCase,
    DeleteTagUseCase,
    ListTagsUseCase,
  ],
})
export class BlogModule {}
