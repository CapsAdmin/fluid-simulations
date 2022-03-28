rm -rf build
yarn build
cd build
echo "init repo"
git init
echo "add origin"
git remote add origin git@github.com:CapsAdmin/fluid-simulations.git
echo "checkout gh-pages"
git checkout -b gh-pages
echo "add everything"
git add --all
echo "commit"
git commit -m "Deploy"
echo "push"
git push -f origin gh-pages